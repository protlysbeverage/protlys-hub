
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

type Challenge = {
  id: number;
  creator_id: string;
  name: string;
  description: string | null;
  step_target: number;
  start_date: string;
  end_date: string;
  visibility: string;
  allow_teams: boolean;
  group_id: string | null;
  challenge_type: string;
  target: number;
  scoring_mode: string;
};

type StepRecord = {
  step_date: string;
  steps: number;
};

type ProteinRecord = {
  log_date: string;
  grams: number;
};

type MeditationRecord = {
  completed_at: string;
  minutes: number;
};

type ChallengeProgress = {
  value: number;
  target: number;
  unit: string;
  detail: string;
  supported: boolean;
};

type ProgressMap = Record<number, ChallengeProgress>;

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function dateDifferenceInclusive(start: string, end: string) {
  const first = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);

  return Math.max(
    1,
    Math.floor((last.getTime() - first.getTime()) / 86400000) + 1,
  );
}

// Legacy membership challenges use a one-point target and no step target.
// They are participation challenges, not activity challenges.
function isMembershipChallenge(challenge: Challenge) {
  return (
    challenge.challenge_type === 'steps' &&
    Number(challenge.step_target) <= 0 &&
    Number(challenge.target) <= 1
  );
}

function challengeMetric(challenge: Challenge) {
  if (isMembershipChallenge(challenge)) {
    return 'Community membership · Be part of Protlys';
  }

  const target = Number(challenge.target || 0);

  switch (challenge.challenge_type) {
    case 'steps':
      return challenge.step_target > 0
        ? `${challenge.step_target.toLocaleString()} steps per day`
        : `${target.toLocaleString()} steps`;

    case 'protein':
      return `${target.toLocaleString()} g protein`;

    case 'distance':
      return 'Distance tracking not available yet';

    case 'movement_days':
      return `${target.toLocaleString()} movement days`;

    case 'stillness':
      return `${target.toLocaleString()} minutes of stillness`;

    default:
      return 'Community challenge';
  }
}

function challengeStatus(challenge: Challenge) {
  const currentDate = today();

  if (challenge.start_date > currentDate) return 'UPCOMING';
  if (challenge.end_date < currentDate) return 'ENDED';
  return 'LIVE NOW';
}

function calculateProgress(
  challenge: Challenge,
  steps: StepRecord[],
  protein: ProteinRecord[],
  meditation: MeditationRecord[],
): ChallengeProgress {
  const start = challenge.start_date;
  const end = challenge.end_date < today()
    ? challenge.end_date
    : today();

  const target = Math.max(1, Number(challenge.target || 0));
  const durationDays = dateDifferenceInclusive(start, challenge.end_date);

  const stepsInPeriod = steps.filter(
    row => row.step_date >= start && row.step_date <= end,
  );

  const proteinInPeriod = protein.filter(
    row => row.log_date >= start && row.log_date <= end,
  );

  const meditationInPeriod = meditation.filter(row => {
    const sessionDate = row.completed_at.slice(0, 10);
    return sessionDate >= start && sessionDate <= end;
  });

  const stepsByDate = new Map<string, number>();

  for (const row of stepsInPeriod) {
    stepsByDate.set(
      row.step_date,
      (stepsByDate.get(row.step_date) ?? 0) +
        Math.max(0, Number(row.steps || 0)),
    );
  }

  const proteinByDate = new Map<string, number>();

  for (const row of proteinInPeriod) {
    proteinByDate.set(
      row.log_date,
      (proteinByDate.get(row.log_date) ?? 0) +
        Math.max(0, Number(row.grams || 0)),
    );
  }

  const meditationByDate = new Map<string, number>();

  for (const row of meditationInPeriod) {
    const sessionDate = row.completed_at.slice(0, 10);

    meditationByDate.set(
      sessionDate,
      (meditationByDate.get(sessionDate) ?? 0) +
        Math.max(0, Number(row.minutes || 0)),
    );
  }

  switch (challenge.challenge_type) {
    case 'steps': {
      const dailyTarget = Math.max(
        1,
        Number(challenge.step_target || challenge.target || 10000),
      );

      if (challenge.scoring_mode === 'days_hit') {
        const daysHit = [...stepsByDate.values()].filter(
          value => value >= dailyTarget,
        ).length;

        return {
          value: daysHit,
          target: durationDays,
          unit: 'days',
          detail: `${daysHit} days reached ${dailyTarget.toLocaleString()} steps`,
          supported: true,
        };
      }

      const total = [...stepsByDate.values()].reduce(
        (sum, value) => sum + value,
        0,
      );

      return {
        value: total,
        target,
        unit: 'steps',
        detail: `${total.toLocaleString()} steps recorded`,
        supported: true,
      };
    }

    case 'protein': {
      if (challenge.scoring_mode === 'days_hit') {
        const daysHit = [...proteinByDate.values()].filter(
          value => value >= target,
        ).length;

        return {
          value: daysHit,
          target: durationDays,
          unit: 'days',
          detail: `${daysHit} days reached ${target.toLocaleString()} g`,
          supported: true,
        };
      }

      const total = [...proteinByDate.values()].reduce(
        (sum, value) => sum + value,
        0,
      );

      return {
        value: total,
        target,
        unit: 'g',
        detail: `${total.toLocaleString()} g protein logged`,
        supported: true,
      };
    }

    case 'movement_days': {
      const movementDays = [...stepsByDate.values()].filter(
        value => value > 0,
      ).length;

      return {
        value: movementDays,
        target,
        unit: 'days',
        detail: `${movementDays} days with recorded steps`,
        supported: true,
      };
    }

    case 'stillness': {
      if (challenge.scoring_mode === 'days_hit') {
        const daysWithSessions = [...meditationByDate.values()].filter(
          value => value > 0,
        ).length;

        return {
          value: daysWithSessions,
          target: durationDays,
          unit: 'days',
          detail: `${daysWithSessions} days with completed sessions`,
          supported: true,
        };
      }

      const totalMinutes = [...meditationByDate.values()].reduce(
        (sum, value) => sum + value,
        0,
      );

      return {
        value: totalMinutes,
        target,
        unit: 'minutes',
        detail: `${totalMinutes.toLocaleString()} minutes completed`,
        supported: true,
      };
    }

    case 'distance':
      return {
        value: 0,
        target,
        unit: 'km',
        detail: 'Distance records are not currently available.',
        supported: false,
      };

    default:
      return {
        value: 0,
        target,
        unit: '',
        detail: 'Progress tracking is not available for this challenge type.',
        supported: false,
      };
  }
}

export default function ChallengesScreen() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [joinedIds, setJoinedIds] = useState<number[]>([]);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const loadChallenges = useCallback(async () => {
    if (!userId) {
      setChallenges([]);
      setJoinedIds([]);
      setProgress({});
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setError('');

    try {
      const currentDate = today();

      const [challengeResult, membershipResult] = await Promise.all([
        supabase
          .from('challenges')
          .select(
            'id, creator_id, name, description, step_target, start_date, end_date, visibility, allow_teams, group_id, challenge_type, target, scoring_mode',
          )
          .gte('end_date', currentDate)
          .order('start_date', { ascending: true }),

        supabase
          .from('challenge_members')
          .select('challenge_id')
          .eq('user_id', userId),
      ]);

      if (challengeResult.error) throw challengeResult.error;
      if (membershipResult.error) throw membershipResult.error;

      const challengeRows = (challengeResult.data ?? []) as Challenge[];
      const membershipIds = (membershipResult.data ?? []).map(
        membership => Number(membership.challenge_id),
      );

      setChallenges(challengeRows);
      setJoinedIds(membershipIds);

      // Membership challenges do not need activity records.
      const joinedActive = challengeRows.filter(
        challenge =>
          membershipIds.includes(challenge.id) &&
          challenge.start_date <= currentDate &&
          !isMembershipChallenge(challenge),
      );

      if (joinedActive.length === 0) {
        setProgress({});
        return;
      }

      const earliestStart = joinedActive.reduce(
        (earliest, challenge) =>
          challenge.start_date < earliest
            ? challenge.start_date
            : earliest,
        currentDate,
      );

      const startTimestamp = new Date(
        `${earliestStart}T00:00:00`,
      ).toISOString();

      const endTimestamp = new Date(
        `${currentDate}T23:59:59.999`,
      ).toISOString();

      const [stepsResult, proteinResult, meditationResult] =
        await Promise.all([
          supabase
            .from('daily_steps')
            .select('step_date, steps')
            .eq('user_id', userId)
            .eq('is_flagged', false)
            .gte('step_date', earliestStart)
            .lte('step_date', currentDate),

          supabase
            .from('protein_logs')
            .select('log_date, grams')
            .eq('user_id', userId)
            .gte('log_date', earliestStart)
            .lte('log_date', currentDate),

          supabase
            .from('meditation_sessions')
            .select('completed_at, minutes')
            .eq('user_id', userId)
            .gte('completed_at', startTimestamp)
            .lte('completed_at', endTimestamp),
        ]);

      if (stepsResult.error) throw stepsResult.error;
      if (proteinResult.error) throw proteinResult.error;
      if (meditationResult.error) throw meditationResult.error;

      const stepRows = (stepsResult.data ?? []) as StepRecord[];
      const proteinRows = (proteinResult.data ?? []) as ProteinRecord[];
      const meditationRows = (meditationResult.data ?? []) as MeditationRecord[];

      const nextProgress: ProgressMap = {};

      for (const challenge of joinedActive) {
        nextProgress[challenge.id] = calculateProgress(
          challenge,
          stepRows,
          proteinRows,
          meditationRows,
        );
      }

      setProgress(nextProgress);
    } catch (err) {
      console.error('Unable to load challenges:', err);
      setError(
        'We could not load challenges or their progress. Pull down to try again.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadChallenges();
  }, [loadChallenges]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    void loadChallenges();
  }, [loadChallenges]);

  const toggleMembership = async (challenge: Challenge) => {
    if (!userId || busyId !== null) return;

    setBusyId(challenge.id);
    setError('');

    const alreadyJoined = joinedIds.includes(challenge.id);

    try {
      if (alreadyJoined) {
        const { error: deleteError } = await supabase
          .from('challenge_members')
          .delete()
          .eq('challenge_id', challenge.id)
          .eq('user_id', userId);

        if (deleteError) throw deleteError;

        setJoinedIds(current =>
          current.filter(id => id !== challenge.id),
        );

        setProgress(current => {
          const next = { ...current };
          delete next[challenge.id];
          return next;
        });
      } else {
        const { error: insertError } = await supabase
          .from('challenge_members')
          .insert({
            challenge_id: challenge.id,
            user_id: userId,
          });

        if (insertError) throw insertError;

        setJoinedIds(current => [...current, challenge.id]);
        await loadChallenges();
      }
    } catch (err) {
      console.error('Challenge membership update failed:', err);
      setError(
        alreadyJoined
          ? 'Unable to leave this challenge. Please try again.'
          : 'Unable to join this challenge. Please try again.',
      );
    } finally {
      setBusyId(null);
    }
  };

  const renderChallenge = ({ item }: { item: Challenge }) => {
    const joined = joinedIds.includes(item.id);
    const status = challengeStatus(item);
    const isBusy = busyId === item.id;
    const hasStarted = item.start_date <= today();
    const membershipChallenge = isMembershipChallenge(item);
    const challengeProgress = progress[item.id];

    const percentage =
      challengeProgress?.supported
        ? Math.min(
            100,
            Math.round(
              (challengeProgress.value /
                Math.max(1, challengeProgress.target)) *
                100,
            ),
          )
        : 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View
            style={[
              styles.statusPill,
              status === 'LIVE NOW'
                ? styles.livePill
                : styles.upcomingPill,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                status === 'LIVE NOW'
                  ? styles.liveText
                  : styles.upcomingText,
              ]}
            >
              {status}
            </Text>
          </View>

          {item.allow_teams && (
            <Text style={styles.teamLabel}>TEAMS ALLOWED</Text>
          )}
        </View>

        <Text style={styles.challengeName}>{item.name}</Text>

        {!!item.description && (
          <Text style={styles.description}>{item.description}</Text>
        )}

        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>
            {membershipChallenge ? 'COMMUNITY INVITATION' : 'CHALLENGE TARGET'}
          </Text>
          <Text style={styles.metricValue}>
            {challengeMetric(item)}
          </Text>
        </View>

        {joined && hasStarted && !membershipChallenge && challengeProgress && (
          <View style={styles.progressBox}>
            <View style={styles.progressHeading}>
              <Text style={styles.progressLabel}>YOUR PROGRESS</Text>
              {challengeProgress.supported && (
                <Text style={styles.progressPercent}>
                  {percentage}%
                </Text>
              )}
            </View>

            {challengeProgress.supported ? (
              <>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${percentage}%` },
                    ]}
                  />
                </View>

                <Text style={styles.progressDetail}>
                  {challengeProgress.detail}
                </Text>

                <Text style={styles.progressNumbers}>
                  {challengeProgress.value.toLocaleString()} /{' '}
                  {challengeProgress.target.toLocaleString()}{' '}
                  {challengeProgress.unit}
                </Text>
              </>
            ) : (
              <Text style={styles.progressDetail}>
                {challengeProgress.detail}
              </Text>
            )}
          </View>
        )}

        {joined && membershipChallenge && hasStarted && (
          <View style={styles.progressBox}>
            <Text style={styles.progressLabel}>MEMBERSHIP STATUS</Text>
            <Text style={styles.membershipMessage}>
              You're part of the Protlys founding community.
            </Text>
          </View>
        )}

        <View style={styles.dateRow}>
          <View>
            <Text style={styles.dateLabel}>STARTS</Text>
            <Text style={styles.dateValue}>
              {formatDate(item.start_date)}
            </Text>
          </View>

          <View>
            <Text style={styles.dateLabel}>ENDS</Text>
            <Text style={styles.dateValue}>
              {formatDate(item.end_date)}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => void toggleMembership(item)}
          disabled={isBusy || status === 'ENDED'}
          style={({ pressed }) => [
            styles.actionButton,
            joined && styles.joinedButton,
            (isBusy || status === 'ENDED') && styles.disabledButton,
            pressed && !isBusy && styles.pressedButton,
          ]}
        >
          {isBusy ? (
            <ActivityIndicator
              color={joined ? '#6BCB45' : '#0D0F0E'}
            />
          ) : (
            <Text
              style={[
                styles.actionText,
                joined && styles.joinedActionText,
              ]}
            >
              {joined
                ? 'LEAVE CHALLENGE'
                : hasStarted
                  ? 'JOIN CHALLENGE'
                  : 'JOIN UPCOMING CHALLENGE'}
            </Text>
          )}
        </Pressable>

        {joined && (
          <Text style={styles.joinedNote}>
            {membershipChallenge
              ? 'Your place in the founding community is confirmed.'
              : 'You are participating in this challenge.'}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={challenges}
        keyExtractor={item => String(item.id)}
        renderItem={renderChallenge}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#6BCB45"
            colors={['#6BCB45']}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>PROTLYS COMMUNITY</Text>
            <Text style={styles.title}>Challenges</Text>
            <Text style={styles.subtitle}>
              Set a goal. Show up. Make progress together.
            </Text>

            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>
                  {challenges.length}
                </Text>
                <Text style={styles.summaryLabel}>AVAILABLE</Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>
                  {joinedIds.length}
                </Text>
                <Text style={styles.summaryLabel}>JOINED</Text>
              </View>
            </View>

            {error !== '' && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>OPEN CHALLENGES</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color="#6BCB45" size="large" />
              <Text style={styles.emptyText}>
                Loading challenges...
              </Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                No open challenges yet
              </Text>
              <Text style={styles.emptyText}>
                Check back soon for new ways to move and grow together.
              </Text>
            </View>
          )
        }
        ListFooterComponent={<View style={{ height: 30 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0D0F0E',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 58,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 22,
  },
  eyebrow: {
    color: '#6BCB45',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  subtitle: {
    color: '#929992',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 30,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#151815',
    borderWidth: 1,
    borderColor: '#292D29',
    borderRadius: 16,
    padding: 16,
  },
  summaryNumber: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
  },
  summaryLabel: {
    color: '#858B85',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 5,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  card: {
    backgroundColor: '#151815',
    borderColor: '#292D29',
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusPill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  livePill: {
    backgroundColor: '#1B3020',
  },
  upcomingPill: {
    backgroundColor: '#292D29',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  liveText: {
    color: '#6BCB45',
  },
  upcomingText: {
    color: '#B9C0B9',
  },
  teamLabel: {
    color: '#858B85',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  challengeName: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  description: {
    color: '#A0A7A0',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  metricBox: {
    backgroundColor: '#0D0F0E',
    borderRadius: 12,
    padding: 14,
    marginTop: 18,
  },
  metricLabel: {
    color: '#858B85',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  metricValue: {
    color: '#6BCB45',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 5,
  },
  progressBox: {
    backgroundColor: '#101310',
    borderWidth: 1,
    borderColor: '#292D29',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  progressHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: '#A0A7A0',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  progressPercent: {
    color: '#6BCB45',
    fontSize: 13,
    fontWeight: '900',
  },
  progressTrack: {
    height: 7,
    backgroundColor: '#292D29',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 12,
  },
  progressFill: {
    height: 7,
    backgroundColor: '#6BCB45',
    borderRadius: 8,
  },
  progressDetail: {
    color: '#A0A7A0',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 9,
  },
  progressNumbers: {
    color: '#6BCB45',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 5,
  },
  membershipMessage: {
    color: '#6BCB45',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 9,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 36,
    marginTop: 18,
    marginBottom: 18,
  },
  dateLabel: {
    color: '#858B85',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 5,
  },
  dateValue: {
    color: '#E5E9E5',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButton: {
    minHeight: 48,
    backgroundColor: '#6BCB45',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  joinedButton: {
    backgroundColor: '#151815',
    borderWidth: 1,
    borderColor: '#6BCB45',
  },
  disabledButton: {
    opacity: 0.45,
  },
  pressedButton: {
    opacity: 0.8,
  },
  actionText: {
    color: '#0D0F0E',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  joinedActionText: {
    color: '#6BCB45',
  },
  joinedNote: {
    color: '#858B85',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 45,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: '#858B85',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 10,
  },
  errorBox: {
    backgroundColor: '#301B1B',
    borderRadius: 10,
    padding: 12,
    marginBottom: 18,
  },
  errorText: {
    color: '#FFB5B5',
    fontSize: 12,
    lineHeight: 18,
  },
});
