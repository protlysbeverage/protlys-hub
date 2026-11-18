
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import ProtlysScreen from '@/components/ProtlysScreen';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { syncRecentDailySteps } from '@/lib/stepsSync';
import StepCounter from '../../modules/protlys-step-counter';

type TrackingStatus =
  | 'checking'
  | 'ready'
  | 'requesting'
  | 'starting'
  | 'listening'
  | 'permission-denied'
  | 'unavailable'
  | 'error';

const ESTIMATED_METRES_PER_STEP = 0.75;
const ESTIMATED_KCAL_PER_STEP = 0.04;

function getTodayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export default function MovementScreen() {
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user?.id ?? null;

  const [status, setStatus] = useState<TrackingStatus>('checking');
  const [steps, setSteps] = useState(0);
  const [stepGoal, setStepGoal] = useState(7500);
  const [message, setMessage] = useState(
    'Checking your movement tracker...',
  );
  const [permanentlyDenied, setPermanentlyDenied] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const syncLock = useRef(false);

  const refreshSteps = useCallback(async () => {
    if (!userId) return;

    let localSteps = 0;

    if (Platform.OS === 'android') {
      try {
        localSteps = Math.max(
          0,
          Math.floor(StepCounter.getTodaySteps(userId)),
        );
      } catch (error) {
        console.error('Unable to read daily steps:', error);
      }
    }

    try {
      const today = getTodayKey();

      const { data, error } = await supabase
        .from('daily_steps')
        .select('steps, is_flagged')
        .eq('user_id', userId)
        .eq('step_date', today)
        .maybeSingle();

      if (error) throw error;

      const storedSteps =
        data && !data.is_flagged
          ? Math.max(0, Number(data.steps ?? 0))
          : 0;

      setSteps(Math.max(localSteps, storedSteps));
    } catch (error) {
      console.error('Unable to load stored daily steps:', error);
      setSteps(localSteps);
    }
  }, [userId]);

  const loadStepGoal = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('step_goal')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Unable to load daily step goal:', error);
      return;
    }

    if (data?.step_goal) {
      setStepGoal(
        Math.max(1000, Math.min(30000, Number(data.step_goal))),
      );
    }
  }, [userId]);

  const syncAndRefresh = useCallback(async () => {
    if (!userId || syncLock.current) return null;

    syncLock.current = true;
    setSyncing(true);

    try {
      const result = await syncRecentDailySteps(userId);
      setSteps(result.steps);
      return result;
    } catch (error) {
      console.error('Unable to synchronise recent steps:', error);
      await refreshSteps();
      return null;
    } finally {
      syncLock.current = false;
      setSyncing(false);
    }
  }, [userId, refreshSteps]);

  const checkTrackingReadiness = useCallback(async () => {
    if (authLoading) return;

    if (!userId) {
      setStatus('error');
      setMessage('Sign in to access your movement progress.');
      return;
    }

    if (Platform.OS !== 'android') {
      setStatus('unavailable');
      setMessage(
        'Native step tracking is currently available on Android.',
      );
      await refreshSteps();
      return;
    }

    setStatus('checking');
    setMessage('Checking your phone and permissions...');

    try {
      if (!StepCounter.isAvailable()) {
        setStatus('unavailable');
        setMessage(
          'This phone does not have a hardware step counter. Automatic step tracking is unavailable on this device.',
        );
        await refreshSteps();
        return;
      }

      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
      );

      if (!granted) {
        setStatus('ready');
        setMessage(
          'Allow physical activity access so Protlys can count your daily steps, including while you use other apps.',
        );
        await refreshSteps();
        return;
      }

      if (!StepCounter.isTracking(userId)) {
        const started = StepCounter.startTracking(userId);

        if (!started) {
          setStatus('error');
          setMessage('Android did not accept the tracking request.');
          await refreshSteps();
          return;
        }

        setStatus('starting');
        setMessage('Starting your background step tracker...');
      } else {
        setStatus('listening');
        setMessage(
          'Your Android step sensor is registered and tracking is active.',
        );
      }

      await refreshSteps();
      await syncAndRefresh();
    } catch (error) {
      console.error('Unable to check tracking readiness:', error);
      setStatus('error');
      setMessage(
        'Unable to verify your phone permissions and tracking service.',
      );
    }
  }, [authLoading, userId, refreshSteps, syncAndRefresh]);

  useEffect(() => {
    void loadStepGoal();
  }, [loadStepGoal]);

  useEffect(() => {
    void checkTrackingReadiness();
  }, [checkTrackingReadiness]);

  useEffect(() => {
    if (!userId) return;

    void refreshSteps();

    const interval = setInterval(() => {
      void refreshSteps();
    }, 10000);

    const subscription = AppState.addEventListener(
      'change',
      nextState => {
        if (nextState === 'active') {
          void refreshSteps();
          void loadStepGoal();
        }
      },
    );

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [userId, refreshSteps, loadStepGoal]);

  useEffect(() => {
    if (!userId || Platform.OS !== 'android') return;

    let attempts = 0;

    const interval = setInterval(() => {
      try {
        const active = StepCounter.isTracking(userId);

        if (active) {
          attempts = 0;
          setStatus('listening');
          setMessage(
            'Your Android step sensor is registered and tracking is active.',
          );
        } else {
          setStatus(current => {
            if (current === 'starting' || current === 'listening') {
              attempts += 1;

              if (attempts >= 10) {
                setMessage(
                  'Android has not confirmed that the tracking service is running. Check permissions and try again.',
                );
                return 'error';
              }

              return 'starting';
            }

            return current;
          });
        }
      } catch (error) {
        console.error('Tracking status check failed:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [userId]);

  const enableTracking = useCallback(async () => {
    if (!userId || Platform.OS !== 'android') return;

    setStatus('requesting');
    setMessage('Requesting permission to count your steps...');

    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
        {
          title: 'Allow Protlys to count your steps',
          message:
            'Protlys uses your phone activity sensor to measure your daily movement and keep your progress updated. Your step count is associated with your Protlys account.',
          buttonPositive: 'Allow',
          buttonNegative: 'Not now',
        },
      );

      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        const blocked =
          result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;

        setPermanentlyDenied(blocked);
        setStatus('permission-denied');
        setMessage(
          blocked
            ? 'Activity Recognition access is blocked. Open Android settings and allow physical activity access for Protlys.'
            : 'Step tracking needs Activity Recognition permission. You can enable it whenever you are ready.',
        );

        await refreshSteps();
        return;
      }

      if (Number(Platform.Version) >= 33) {
        const notificationPermission =
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;

        const notificationGranted =
          await PermissionsAndroid.check(notificationPermission);

        if (!notificationGranted) {
          await PermissionsAndroid.request(
            notificationPermission,
            {
              title: 'Step tracking notification',
              message:
                'Android displays a notification while Protlys keeps your step counter running in the background.',
              buttonPositive: 'Allow',
              buttonNegative: 'Not now',
            },
          );
        }
      }

      setStatus('starting');
      setMessage('Starting the background tracking service...');

      const started = StepCounter.startTracking(userId);

      if (!started) {
        setStatus('error');
        setMessage('Android did not accept the tracking request.');
        return;
      }

      await refreshSteps();

      const syncResult = await syncAndRefresh();

      setMessage(
        syncResult
          ? 'Tracking has started. Your recent step history has been synchronised.'
          : 'Tracking has started. Step history will synchronise when your connection is available.',
      );
    } catch (error) {
      console.error('Unable to enable step tracking:', error);
      setStatus('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to start step tracking. Please try again.',
      );
    }
  }, [userId, refreshSteps, syncAndRefresh]);

  const openSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  const busy =
    status === 'checking' ||
    status === 'requesting' ||
    status === 'starting';

  const progress = Math.min(steps / stepGoal, 1);
  const remaining = Math.max(0, stepGoal - steps);

  const distanceKm =
    (steps * ESTIMATED_METRES_PER_STEP) / 1000;

  const estimatedCalories =
    Math.round(steps * ESTIMATED_KCAL_PER_STEP);

  return (
    <ProtlysScreen
      eyebrow="Your activity"
      title="Movement"
      subtitle="Every step counts. Build consistency, one day at a time."
    >
      <View style={styles.card}>
        <Text style={styles.label}>TODAY'S STEPS</Text>

        <Text style={styles.steps}>{steps.toLocaleString()}</Text>

        <View style={styles.statusRow}>
          {busy ? (
            <ActivityIndicator color="#6BCB45" size="small" />
          ) : (
            <View
              style={[
                styles.statusDot,
                status === 'listening'
                  ? styles.statusActive
                  : styles.statusInactive,
              ]}
            />
          )}

          <Text style={styles.statusText}>
            {status === 'checking'
              ? 'Checking device'
              : status === 'requesting'
                ? 'Requesting permission'
                : status === 'starting'
                  ? 'Verifying tracker'
                  : status === 'listening'
                    ? 'Tracking active'
                    : status === 'ready'
                      ? 'Setup required'
                      : status === 'permission-denied'
                        ? 'Permission needed'
                        : status === 'unavailable'
                          ? 'Sensor unavailable'
                          : 'Tracking not active'}
          </Text>
        </View>

        <Text style={styles.note}>{message}</Text>

        {syncing && (
          <View style={styles.syncRow}>
            <ActivityIndicator color="#6BCB45" size="small" />
            <Text style={styles.syncText}>
              Synchronising recent steps...
            </Text>
          </View>
        )}

        {status === 'ready' ? (
          <Pressable style={styles.button} onPress={enableTracking}>
            <Text style={styles.buttonText}>Enable step tracking</Text>
          </Pressable>
        ) : status === 'permission-denied' && permanentlyDenied ? (
          <Pressable style={styles.button} onPress={openSettings}>
            <Text style={styles.buttonText}>Open Android settings</Text>
          </Pressable>
        ) : status === 'permission-denied' || status === 'error' ? (
          <Pressable
            style={styles.button}
            onPress={checkTrackingReadiness}
          >
            <Text style={styles.buttonText}>Check again</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>YOUR DAILY GOAL</Text>
        <Text style={styles.goal}>
          {stepGoal.toLocaleString()} steps
        </Text>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress * 100}%` },
            ]}
          />
        </View>

        <Text style={styles.note}>
          {remaining === 0
            ? 'You have reached your daily movement goal. Great work!'
            : `${remaining.toLocaleString()} steps remaining to reach your goal.`}
        </Text>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.label}>EST. DISTANCE</Text>
          <Text style={styles.metricValue}>
            {distanceKm.toFixed(2)} km
          </Text>
          <Text style={styles.metricNote}>Based on average stride</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.label}>EST. CALORIES</Text>
          <Text style={styles.metricValue}>
            {estimatedCalories.toLocaleString()} kcal
          </Text>
          <Text style={styles.metricNote}>General activity estimate</Text>
        </View>
      </View>

      <Text style={styles.disclaimer}>
        Distance and calorie figures are estimates, not direct
        measurements. They use general step-based averages and do not
        account for your personal stride, body weight, speed or terrain.
        Steps are collected by your phone's hardware counter and saved
        locally while tracking is active. Protlys synchronises recent
        records when the app is active and connected to the internet.
      </Text>
    </ProtlysScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#151815',
    borderColor: '#292D29',
    borderWidth: 1,
    borderRadius: 18,
    padding: 22,
    marginTop: 20,
  },
  label: {
    color: '#A1A8A1',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  steps: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '800',
    marginTop: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 12,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  statusActive: {
    backgroundColor: '#6BCB45',
  },
  statusInactive: {
    backgroundColor: '#858B85',
  },
  statusText: {
    color: '#6BCB45',
    fontSize: 13,
    fontWeight: '700',
  },
  note: {
    color: '#858B85',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
  goal: {
    color: '#6BCB45',
    fontSize: 23,
    fontWeight: '800',
    marginTop: 8,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#292D29',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 16,
  },
  progressFill: {
    height: 8,
    backgroundColor: '#6BCB45',
    borderRadius: 8,
  },
  button: {
    backgroundColor: '#6BCB45',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 18,
  },
  buttonText: {
    color: '#0D0F0E',
    fontSize: 14,
    fontWeight: '800',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  syncText: {
    color: '#A1A8A1',
    fontSize: 11,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  metricCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#151815',
    borderColor: '#292D29',
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
  },
  metricValue: {
    color: '#6BCB45',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 10,
  },
  metricNote: {
    color: '#858B85',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 7,
  },
  disclaimer: {
    color: '#737973',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 16,
  },
});
