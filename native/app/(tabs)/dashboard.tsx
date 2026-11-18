
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import StepCounter from '../../modules/protlys-step-counter';
import GroupLeaderboard from '@/components/GroupLeaderboard';
import AccountDeletion from '@/components/AccountDeletion';

type Profile = {
  display_name: string | null;
  points: number;
  streak: number;
  step_goal: number;
  step_streak: number;
  target_g: number;
};

type StepRecord = {
  step_date: string;
  steps: number;
  is_flagged: boolean;
};

type GroupMembership = {
  group_id: string;
  groups: {
    name: string;
    emoji: string | null;
  } | null;
};

type DashboardData = {
  profile: Profile;
  steps: StepRecord[];
  proteinToday: number;
  groups: GroupMembership[];
  achievementCount: number;
  movementStreak: number;
  lifetimeSteps: number;
};

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getWeekDates(today: string) {
  const current = new Date(`${today}T12:00:00`);
  const monday = new Date(current);
  const day = monday.getDay();

  monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function calculateMovementStreak(
  records: StepRecord[],
  today: string,
): number {
  const activeDates = new Set(
    records
      .filter(
        record =>
          !record.is_flagged &&
          Number(record.steps) > 0,
      )
      .map(record => record.step_date),
  );

  const cursor = new Date(`${today}T12:00:00`);

  if (!activeDates.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;

  while (activeDates.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function greeting() {
  const hour = new Date().getHours();

  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Retrieve the complete available step history in pages.
// This avoids relying on the default Supabase row limit.
async function fetchAllStepRecords(
  userId: string,
): Promise<StepRecord[]> {
  const pageSize = 1000;
  let offset = 0;
  const allRecords: StepRecord[] = [];

  while (true) {
    const { data, error } = await supabase
      .from('daily_steps')
      .select('step_date, steps, is_flagged')
      .eq('user_id', userId)
      .order('step_date', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;

    const page = (data ?? []) as StepRecord[];
    allRecords.push(...page);

    if (page.length < pageSize) break;

    offset += pageSize;
  }

  return allRecords;
}

export default function DashboardScreen() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [data, setData] = useState<DashboardData | null>(null);
  const [todaySteps, setTodaySteps] = useState(0);
  const [tracking, setTracking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const today = dateKey(new Date());
  const weekDates = useMemo(() => getWeekDates(today), [today]);

  const loadDashboard = useCallback(async () => {
    if (!userId) {
      setData(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setError('');

    try {
      let sensorSteps = 0;
      let sensorTracking = false;

      try {
        sensorSteps = Math.max(
          0,
          Math.floor(StepCounter.getTodaySteps(userId)),
        );

        sensorTracking = StepCounter.isTracking(userId);
      } catch (sensorError) {
        console.warn('Step sensor is not available:', sensorError);
      }

      const [
        profileResult,
        allStepRecords,
        proteinResult,
        groupsResult,
        achievementsResult,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select(
            'display_name, points, streak, step_goal, step_streak, target_g',
          )
          .eq('id', userId)
          .maybeSingle(),

        fetchAllStepRecords(userId),

        supabase
          .from('protein_logs')
          .select('grams')
          .eq('user_id', userId)
          .eq('log_date', today),

        supabase
          .from('group_members')
          .select('group_id, groups(name, emoji)')
          .eq('user_id', userId),

        supabase
          .from('user_achievements')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (proteinResult.error) throw proteinResult.error;
      if (groupsResult.error) throw groupsResult.error;
      if (achievementsResult.error) throw achievementsResult.error;

      if (!profileResult.data) {
        throw new Error('Your profile could not be found.');
      }

      const profile = profileResult.data as Profile;

      // Exclude flagged records from totals, streaks and charts.
      const stepRecords = allStepRecords.filter(
        record => !record.is_flagged,
      );

      const movementStreak = calculateMovementStreak(
        stepRecords,
        today,
      );

      const storedLifetimeSteps = stepRecords.reduce(
        (sum, record) => sum + Math.max(0, Number(record.steps) || 0),
        0,
      );

      const storedTodaySteps =
        stepRecords.find(record => record.step_date === today)?.steps ?? 0;

      // Include today's live sensor count if it has not been synced yet.
      const lifetimeSteps =
        storedLifetimeSteps +
        Math.max(0, sensorSteps - Number(storedTodaySteps));

      const proteinToday = (proteinResult.data ?? []).reduce(
        (sum, item) => sum + Number(item.grams || 0),
        0,
      );

      const groupRows = (
        groupsResult.data ?? []
      ) as unknown as GroupMembership[];

      setData({
        profile,
        steps: stepRecords,
        proteinToday,
        groups: groupRows,
        achievementCount: achievementsResult.count ?? 0,
        movementStreak,
        lifetimeSteps,
      });

      setTodaySteps(sensorSteps);
      setTracking(sensorTracking);
    } catch (err) {
      console.error('Dashboard load failed:', err);
      setError('Could not load your dashboard. Pull down to try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, today]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    void loadDashboard();
  }, [loadDashboard]);

  const profile = data?.profile;

  const stepGoal = Math.max(1, Number(profile?.step_goal ?? 7500));
  const proteinTarget = Math.max(1, Number(profile?.target_g ?? 120));

  const todayStoredSteps =
    data?.steps.find(item => item.step_date === today)?.steps ?? 0;

  const displayedTodaySteps = Math.max(
    todaySteps,
    Number(todayStoredSteps),
  );

  const stepProgress = Math.min(displayedTodaySteps / stepGoal, 1);

  const proteinProgress = Math.min(
    (data?.proteinToday ?? 0) / proteinTarget,
    1,
  );

  const weeklyBars = weekDates.map(date => {
    const key = dateKey(date);
    const stored = data?.steps.find(item => item.step_date === key);

    const steps =
      key === today
        ? Math.max(Number(stored?.steps ?? 0), todaySteps)
        : Number(stored?.steps ?? 0);

    return {
      key,
      label: date.toLocaleDateString([], { weekday: 'short' }).slice(0, 2),
      steps,
      isToday: key === today,
    };
  });

  const weeklyTotal = weeklyBars.reduce(
    (sum, item) => sum + item.steps,
    0,
  );

  const maxBar = Math.max(
    stepGoal,
    ...weeklyBars.map(item => item.steps),
    1,
  );

  const displayName =
    profile?.display_name?.trim() ||
    session?.user?.email?.split('@')[0] ||
    'Member';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor="#6BCB45"
          colors={['#6BCB45']}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>PROTLYS COMMUNITY</Text>
        <Text style={styles.greeting}>{greeting()},</Text>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.subtitle}>
          Your progress, all in one place.
        </Text>
      </View>

      {error !== '' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void loadDashboard()}>
            <Text style={styles.retryText}>TRY AGAIN</Text>
          </Pressable>
        </View>
      )}

      {loading && !data ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#6BCB45" />
          <Text style={styles.loadingText}>Loading your progress...</Text>
        </View>
      ) : (
        <>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>🏃</Text>
              <Text style={styles.statLabel}>TOTAL POINTS</Text>
              <Text style={styles.statValue}>
                {(profile?.points ?? 0).toLocaleString()}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statIcon}>🔥</Text>
              <Text style={styles.statLabel}>STEP STREAK</Text>
              <Text style={styles.statValue}>
                {data?.movementStreak ?? 0}
                <Text style={styles.statUnit}> days</Text>
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statIcon}>🏅</Text>
              <Text style={styles.statLabel}>ACHIEVEMENTS</Text>
              <Text style={styles.statValue}>
                {data?.achievementCount ?? 0}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statIcon}>⚡</Text>
              <Text style={styles.statLabel}>ACTIVITY STREAK</Text>
              <Text style={styles.statValue}>
                {profile?.streak ?? 0}
                <Text style={styles.statUnit}> days</Text>
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statIcon}>👣</Text>
              <Text style={styles.statLabel}>TOTAL STEPS</Text>
              <Text style={styles.statValue}>
                {(data?.lifetimeSteps ?? 0).toLocaleString()}
              </Text>
              <Text style={styles.statUnit}>all recorded time</Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>TODAY'S MOVEMENT</Text>
                <Text style={styles.sectionSubtitle}>
                  Your daily step goal
                </Text>
              </View>

              <View
                style={[
                  styles.statusPill,
                  tracking ? styles.statusActive : styles.statusInactive,
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    tracking ? styles.dotActive : styles.dotInactive,
                  ]}
                />

                <Text style={styles.statusText}>
                  {tracking ? 'TRACKING' : 'NOT TRACKING'}
                </Text>
              </View>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.metricRow}>
                <View>
                  <Text style={styles.metricNumber}>
                    {displayedTodaySteps.toLocaleString()}
                  </Text>
                  <Text style={styles.metricCaption}>steps today</Text>
                </View>

                <View style={styles.metricRight}>
                  <Text style={styles.metricGoal}>
                    {Math.round(stepProgress * 100)}%
                  </Text>
                  <Text style={styles.metricCaption}>
                    of {stepGoal.toLocaleString()}
                  </Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${stepProgress * 100}%` },
                  ]}
                />
              </View>

              <Text style={styles.cardFootnote}>
                {displayedTodaySteps >= stepGoal
                  ? 'Daily step goal reached. Great work!'
                  : `${(stepGoal - displayedTodaySteps).toLocaleString()} steps to your goal`}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>PROTEIN TODAY</Text>
                <Text style={styles.sectionSubtitle}>
                  Your daily nutrition progress
                </Text>
              </View>

              <Text style={styles.proteinSymbol}>P</Text>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.metricRow}>
                <View>
                  <Text style={styles.metricNumber}>
                    {data?.proteinToday ?? 0}
                    <Text style={styles.metricUnit}> g</Text>
                  </Text>
                  <Text style={styles.metricCaption}>protein logged</Text>
                </View>

                <View style={styles.metricRight}>
                  <Text style={styles.metricGoal}>
                    {Math.round(proteinProgress * 100)}%
                  </Text>
                  <Text style={styles.metricCaption}>
                    of {proteinTarget} g
                  </Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.proteinFill,
                    { width: `${proteinProgress * 100}%` },
                  ]}
                />
              </View>

              <Text style={styles.cardFootnote}>
                {proteinProgress >= 1
                  ? 'You have reached your daily protein target.'
                  : `${proteinTarget - (data?.proteinToday ?? 0)} g remaining to your target`}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>THIS WEEK</Text>
                <Text style={styles.sectionSubtitle}>
                  Your recorded daily steps
                </Text>
              </View>

              <View style={styles.weekTotal}>
                <Text style={styles.weekTotalValue}>
                  {weeklyTotal.toLocaleString()}
                </Text>
                <Text style={styles.weekTotalLabel}>STEPS</Text>
              </View>
            </View>

            <View style={styles.chartCard}>
              <View style={styles.chart}>
                {weeklyBars.map(item => {
                  const height = Math.max(
                    5,
                    (item.steps / maxBar) * 112,
                  );

                  return (
                    <View key={item.key} style={styles.chartColumn}>
                      <Text style={styles.barValue}>
                        {item.steps >= 1000
                          ? `${(item.steps / 1000).toFixed(1)}k`
                          : item.steps > 0
                            ? String(item.steps)
                            : '—'}
                      </Text>

                      <View style={styles.barArea}>
                        <View
                          style={[
                            styles.bar,
                            {
                              height,
                              backgroundColor: item.isToday
                                ? '#6BCB45'
                                : '#354334',
                            },
                          ]}
                        />
                      </View>

                      <Text
                        style={[
                          styles.barLabel,
                          item.isToday && styles.todayBarLabel,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          <GroupLeaderboard />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>YOUR GROUPS</Text>
            <Text style={styles.sectionSubtitle}>
              The communities you belong to
            </Text>

            {data?.groups.length ? (
              data.groups.map(membership => (
                <View
                  key={membership.group_id}
                  style={styles.groupRow}
                >
                  <View style={styles.groupIcon}>
                    <Text style={styles.groupEmoji}>
                      {membership.groups?.emoji || '👥'}
                    </Text>
                  </View>

                  <View style={styles.groupDetails}>
                    <Text style={styles.groupName}>
                      {membership.groups?.name || 'Protlys group'}
                    </Text>
                    <Text style={styles.groupCaption}>
                      Community member
                    </Text>
                  </View>

                  <Text style={styles.groupArrow}>›</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No groups yet</Text>
                <Text style={styles.emptyText}>
                  Join a community in Challenges to see it here.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerBrand}>PROTLYS</Text>
            <Text style={styles.footerText}>
              Protein. Movement. Community.
            </Text>
          </View>
        </>
      )}

      <AccountDeletion />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0D0F0E',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 58,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  eyebrow: {
    color: '#6BCB45',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 14,
  },
  greeting: {
    color: '#A3AAA3',
    fontSize: 17,
    fontWeight: '600',
  },
  name: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: 3,
  },
  subtitle: {
    color: '#858B85',
    fontSize: 13,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 30,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    minHeight: 125,
    backgroundColor: '#151815',
    borderWidth: 1,
    borderColor: '#292D29',
    borderRadius: 15,
    padding: 14,
  },
  statIcon: {
    fontSize: 18,
    marginBottom: 11,
  },
  statLabel: {
    color: '#858B85',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
    marginTop: 5,
  },
  statUnit: {
    color: '#929992',
    fontSize: 11,
    fontWeight: '600',
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sectionSubtitle: {
    color: '#858B85',
    fontSize: 11,
    marginTop: 5,
  },
  featureCard: {
    backgroundColor: '#151815',
    borderWidth: 1,
    borderColor: '#292D29',
    borderRadius: 16,
    padding: 17,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricNumber: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
  },
  metricUnit: {
    color: '#6BCB45',
    fontSize: 18,
  },
  metricCaption: {
    color: '#858B85',
    fontSize: 11,
    marginTop: 3,
  },
  metricRight: {
    alignItems: 'flex-end',
  },
  metricGoal: {
    color: '#6BCB45',
    fontSize: 22,
    fontWeight: '900',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#292D29',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 19,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6BCB45',
    borderRadius: 10,
  },
  proteinFill: {
    height: '100%',
    backgroundColor: '#A4D96B',
    borderRadius: 10,
  },
  cardFootnote: {
    color: '#929992',
    fontSize: 10,
    marginTop: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusActive: {
    backgroundColor: '#1C321B',
  },
  statusInactive: {
    backgroundColor: '#242824',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  dotActive: {
    backgroundColor: '#6BCB45',
  },
  dotInactive: {
    backgroundColor: '#858B85',
  },
  statusText: {
    color: '#B7C0B7',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  proteinSymbol: {
    width: 30,
    height: 30,
    borderRadius: 10,
    overflow: 'hidden',
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: '#20331D',
    color: '#6BCB45',
    fontSize: 16,
    fontWeight: '900',
  },
  weekTotal: {
    alignItems: 'flex-end',
  },
  weekTotalValue: {
    color: '#6BCB45',
    fontSize: 17,
    fontWeight: '900',
  },
  weekTotalLabel: {
    color: '#858B85',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: '#151815',
    borderWidth: 1,
    borderColor: '#292D29',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 12,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 155,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barValue: {
    color: '#858B85',
    fontSize: 8,
    marginBottom: 7,
  },
  barArea: {
    height: 112,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 17,
    borderRadius: 6,
    minHeight: 5,
  },
  barLabel: {
    color: '#858B85',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 9,
  },
  todayBarLabel: {
    color: '#6BCB45',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151815',
    borderWidth: 1,
    borderColor: '#292D29',
    borderRadius: 13,
    padding: 12,
    marginTop: 10,
  },
  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#242A23',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupEmoji: {
    fontSize: 19,
  },
  groupDetails: {
    flex: 1,
    marginLeft: 12,
  },
  groupName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  groupCaption: {
    color: '#858B85',
    fontSize: 10,
    marginTop: 4,
  },
  groupArrow: {
    color: '#6BCB45',
    fontSize: 25,
    paddingHorizontal: 5,
  },
  emptyCard: {
    backgroundColor: '#151815',
    borderWidth: 1,
    borderColor: '#292D29',
    borderRadius: 14,
    padding: 19,
    marginTop: 12,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyText: {
    color: '#858B85',
    fontSize: 11,
    lineHeight: 18,
    marginTop: 6,
  },
  errorBox: {
    backgroundColor: '#301B1B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  errorText: {
    color: '#FFB5B5',
    fontSize: 12,
    lineHeight: 18,
  },
  retryText: {
    color: '#6BCB45',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 10,
  },
  loading: {
    paddingVertical: 65,
    alignItems: 'center',
  },
  loadingText: {
    color: '#858B85',
    fontSize: 12,
    marginTop: 13,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#292D29',
    paddingTop: 19,
    alignItems: 'center',
    marginTop: 2,
  },
  footerBrand: {
    color: '#6BCB45',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  footerText: {
    color: '#707770',
    fontSize: 10,
    marginTop: 6,
  },
});
