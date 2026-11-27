
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

type Period = 'this_week' | 'last_week';

type Group = {
  id: string;
  name: string;
  emoji: string | null;
};

type LeaderboardEntry = {
  rank: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  steps: number;
  last_week_rank: number | null;
  steps_to_pass: number | null;
  rival_username: string | null;
  improvement: number | null;
};

export default function GroupLeaderboard() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [groups, setGroups] = useState<Group[]>([]);
  const [results, setResults] = useState<Record<string, LeaderboardEntry[]>>({});
  const [period, setPeriod] = useState<Period>('this_week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!userId) {
      setGroups([]);
      setResults({});
      setLoading(false);
      return;
    }

    setError('');

    try {
      const { data: memberships, error: membershipError } = await supabase
        .from('group_members')
        .select('group_id, groups(name, emoji)')
        .eq('user_id', userId);

      if (membershipError) throw membershipError;

      const nextGroups: Group[] = (memberships ?? []).map((row: any) => ({
        id: row.group_id,
        name: row.groups?.name ?? 'Protlys group',
        emoji: row.groups?.emoji ?? '👥',
      }));

      setGroups(nextGroups);

      const leaderboardResults = await Promise.all(
        nextGroups.map(async (group) => {
          const { data, error: leaderboardError } = await supabase.rpc(
            'get_group_leaderboard',
            {
              p_group_id: group.id,
              p_period: period,
              p_limit: 10,
              p_offset: 0,
            },
          );

          if (leaderboardError) throw leaderboardError;

          return {
            groupId: group.id,
            entries: (data ?? []) as LeaderboardEntry[],
          };
        }),
      );

      const mapped: Record<string, LeaderboardEntry[]> = {};

      leaderboardResults.forEach((result) => {
        mapped[result.groupId] = result.entries;
      });

      setResults(mapped);
    } catch (err) {
      console.error('Group leaderboard failed:', err);
      setError('Unable to load the group leaderboard. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userId, period]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <View>
          <Text style={styles.title}>GROUP LEADERBOARD</Text>
          <Text style={styles.subtitle}>
            Compete with your communities
          </Text>
        </View>
        <Text style={styles.trophy}>🏆</Text>
      </View>

      <View style={styles.periodSwitch}>
        <Pressable
          onPress={() => setPeriod('this_week')}
          style={[
            styles.periodButton,
            period === 'this_week' && styles.periodSelected,
          ]}
        >
          <Text
            style={[
              styles.periodText,
              period === 'this_week' && styles.periodTextSelected,
            ]}
          >
            This week
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setPeriod('last_week')}
          style={[
            styles.periodButton,
            period === 'last_week' && styles.periodSelected,
          ]}
        >
          <Text
            style={[
              styles.periodText,
              period === 'last_week' && styles.periodTextSelected,
            ]}
          >
            Last week
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#6BCB45" />
          <Text style={styles.loadingText}>Loading rankings...</Text>
        </View>
      ) : error ? (
        <Pressable onPress={() => {
          setLoading(true);
          void load();
        }} style={styles.emptyCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.retry}>TAP TO RETRY</Text>
        </Pressable>
      ) : groups.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No group rankings yet</Text>
          <Text style={styles.emptyText}>
            Join a group through Challenges to appear here.
          </Text>
        </View>
      ) : (
        groups.map((group) => {
          const entries = results[group.id] ?? [];

          return (
            <View key={group.id} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <View style={styles.groupIdentity}>
                  <Text style={styles.groupEmoji}>
                    {group.emoji || '👥'}
                  </Text>
                  <Text style={styles.groupName}>{group.name}</Text>
                </View>
                <Text style={styles.memberCount}>
                  {entries.length} shown
                </Text>
              </View>

              {entries.length === 0 ? (
                <Text style={styles.noEntries}>
                  No opted-in step records for this period yet.
                </Text>
              ) : (
                entries.map((entry) => {
                  const isMe = entry.user_id === userId;

                  return (
                    <View
                      key={entry.user_id}
                      style={[
                        styles.memberRow,
                        isMe && styles.myRow,
                      ]}
                    >
                      <View style={styles.rankColumn}>
                        <Text
                          style={[
                            styles.rank,
                            entry.rank <= 3 && styles.topRank,
                          ]}
                        >
                          {entry.rank}
                        </Text>
                      </View>

                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {(entry.username || 'M')
                            .trim()
                            .charAt(0)
                            .toUpperCase()}
                        </Text>
                      </View>

                      <View style={styles.memberInfo}>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.memberName,
                            isMe && styles.myName,
                          ]}
                        >
                          {entry.username}
                          {isMe ? ' (You)' : ''}
                        </Text>
                        <Text style={styles.memberSteps}>
                          {Number(entry.steps).toLocaleString()} steps
                        </Text>
                      </View>

                      {entry.rank === 1 ? (
                        <Text style={styles.medal}>🥇</Text>
                      ) : entry.rank === 2 ? (
                        <Text style={styles.medal}>🥈</Text>
                      ) : entry.rank === 3 ? (
                        <Text style={styles.medal}>🥉</Text>
                      ) : null}
                    </View>
                  );
                })
              )}

              <Text style={styles.privacyNote}>
                Only members sharing group steps appear in these rankings.
              </Text>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 28,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtitle: {
    color: '#858B85',
    fontSize: 11,
    marginTop: 5,
  },
  trophy: {
    fontSize: 23,
  },
  periodSwitch: {
    flexDirection: 'row',
    backgroundColor: '#151815',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#292D29',
    padding: 4,
    marginBottom: 13,
  },
  periodButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  periodSelected: {
    backgroundColor: '#263923',
  },
  periodText: {
    color: '#858B85',
    fontSize: 11,
    fontWeight: '700',
  },
  periodTextSelected: {
    color: '#6BCB45',
  },
  groupCard: {
    backgroundColor: '#151815',
    borderWidth: 1,
    borderColor: '#292D29',
    borderRadius: 15,
    padding: 13,
    marginBottom: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#292D29',
    marginBottom: 5,
  },
  groupIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupEmoji: {
    fontSize: 19,
    marginRight: 9,
  },
  groupName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    flexShrink: 1,
  },
  memberCount: {
    color: '#858B85',
    fontSize: 9,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#242824',
    borderRadius: 7,
  },
  myRow: {
    backgroundColor: '#202B1E',
    paddingHorizontal: 7,
  },
  rankColumn: {
    width: 24,
    alignItems: 'center',
  },
  rank: {
    color: '#858B85',
    fontSize: 13,
    fontWeight: '900',
  },
  topRank: {
    color: '#6BCB45',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#293329',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 9,
  },
  avatarText: {
    color: '#A7D88E',
    fontSize: 13,
    fontWeight: '900',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: '#DDE2DD',
    fontSize: 11,
    fontWeight: '700',
  },
  myName: {
    color: '#6BCB45',
  },
  memberSteps: {
    color: '#858B85',
    fontSize: 9,
    marginTop: 4,
  },
  medal: {
    fontSize: 17,
    marginLeft: 5,
  },
  privacyNote: {
    color: '#707770',
    fontSize: 9,
    lineHeight: 14,
    marginTop: 11,
  },
  noEntries: {
    color: '#858B85',
    fontSize: 11,
    paddingVertical: 15,
  },
  emptyCard: {
    backgroundColor: '#151815',
    borderWidth: 1,
    borderColor: '#292D29',
    borderRadius: 13,
    padding: 16,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyText: {
    color: '#858B85',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
  },
  errorText: {
    color: '#FFB5B5',
    fontSize: 11,
  },
  retry: {
    color: '#6BCB45',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 9,
  },
  loading: {
    padding: 25,
    alignItems: 'center',
  },
  loadingText: {
    color: '#858B85',
    fontSize: 11,
    marginTop: 10,
  },
});
