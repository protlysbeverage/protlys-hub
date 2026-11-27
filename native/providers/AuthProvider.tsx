import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  AppState,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import StepCounter from '../modules/protlys-step-counter';
import { syncRecentDailySteps } from '@/lib/stepsSync';

type AuthContextType = {
  session: Session | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;

      if (error) {
        console.error('Unable to restore session:', error.message);
      }

      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading || Platform.OS !== 'android') return;

    let cancelled = false;
    let syncing = false;

    const userId = session?.user?.id ?? null;

    async function ensureTrackingAndSync() {
      if (cancelled) return;

      if (!userId) {
        try {
          StepCounter.stopTracking();
        } catch (error) {
          console.error('Unable to stop step tracking:', error);
        }
        return;
      }

      if (syncing) return;
      syncing = true;

      try {
        const permissionGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
        );

        if (cancelled) return;

        // Permission is needed to collect new steps, not to sync
        // step history that has already been saved locally.
        if (
          permissionGranted &&
          !StepCounter.isTracking(userId)
        ) {
          StepCounter.startTracking(userId);
        }

        const result = await syncRecentDailySteps(userId);

        if (!cancelled && result.changed) {
          console.log(
            `Protlys synced step history. Today's total: ${result.steps}.`,
          );
        }
      } catch (error) {
        console.error('Step tracking or sync failed:', error);
      } finally {
        syncing = false;
      }
    }

    void ensureTrackingAndSync();

    const interval = setInterval(() => {
      void ensureTrackingAndSync();
    }, 60000);

    const appStateSubscription = AppState.addEventListener(
      'change',
      nextState => {
        if (nextState === 'active') {
          void ensureTrackingAndSync();
        }
      },
    );

    return () => {
      cancelled = true;
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [loading, session?.user?.id]);

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}