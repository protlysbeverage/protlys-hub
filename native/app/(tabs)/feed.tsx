
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

type Profile = {
  display_name: string | null;
  avatar_url: string | null;
};

type FeedPost = {
  id: number;
  user_id: string;
  body: string | null;
  image_url: string | null;
  post_type: string;
  created_at: string;
  profiles: Profile | null;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

type FeedComment = {
  id: number;
  post_id: number;
  user_id: string;
  body: string;
  created_at: string;
  profiles: Profile | null;
};

type PostRow = Omit<
  FeedPost,
  'likeCount' | 'commentCount' | 'likedByMe'
>;

type ReportTarget = {
  contentType: 'feed_post' | 'feed_comment';
  contentId: string;
  userId: string;
  body: string;
  author: string;
};

const PAGE_SIZE = 40;

const REPORT_REASONS = [
  'Spam',
  'Harassment or bullying',
  'Hate or abusive content',
  'Inappropriate content',
  'Impersonation',
  'Misleading health advice',
  'Other',
];

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('') || 'P';
}

function timeAgo(value: string) {
  const date = new Date(value);
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 1000),
  );

  if (seconds < 60) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}

function Avatar({
  name,
  size = 42,
}: {
  name: string;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={styles.avatarText}>{initials(name)}</Text>
    </View>
  );
}

export default function FeedScreen() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyLikeIds, setBusyLikeIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [activePost, setActivePost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [reportReason, setReportReason] = useState('Spam');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const loadFeed = useCallback(async (showLoader = true) => {
    if (!userId) {
      setPosts([]);
      setBlockedUserIds([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (showLoader) setLoading(true);
    setError(null);

    try {
      const { data: blockedData, error: blockedError } =
        await supabase.rpc('get_blocked_user_ids');

      if (blockedError) throw blockedError;

      const blockedIds = (blockedData ?? [])
        .map((item: { user_id: string }) => item.user_id);

      setBlockedUserIds(blockedIds);

      const { data, error: postsError } = await supabase
        .from('feed_posts')
        .select(`
          id,
          user_id,
          body,
          image_url,
          post_type,
          created_at,
          profiles!feed_posts_user_id_fkey (
            display_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (postsError) throw postsError;

      const rows = ((data ?? []) as unknown as PostRow[])
        .filter(post => !blockedIds.includes(post.user_id));

      const ids = rows.map(post => post.id);

      if (ids.length === 0) {
        setPosts([]);
        return;
      }

      const [
        { data: likesData, error: likesError },
        { data: commentsData, error: commentsError },
      ] = await Promise.all([
        supabase
          .from('feed_likes')
          .select('post_id,user_id')
          .in('post_id', ids),

        supabase
          .from('feed_comments')
          .select('post_id')
          .in('post_id', ids),
      ]);

      if (likesError) throw likesError;
      if (commentsError) throw commentsError;

      const likeCounts = new Map<number, number>();
      const commentCounts = new Map<number, number>();
      const likedIds = new Set<number>();

      for (const like of likesData ?? []) {
        likeCounts.set(
          like.post_id,
          (likeCounts.get(like.post_id) ?? 0) + 1,
        );

        if (like.user_id === userId) {
          likedIds.add(like.post_id);
        }
      }

      for (const comment of commentsData ?? []) {
        commentCounts.set(
          comment.post_id,
          (commentCounts.get(comment.post_id) ?? 0) + 1,
        );
      }

      setPosts(
        rows.map(post => ({
          ...post,
          likeCount: likeCounts.get(post.id) ?? 0,
          commentCount: commentCounts.get(post.id) ?? 0,
          likedByMe: likedIds.has(post.id),
        })),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to load the feed.';

      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    void loadFeed(false);
  }, [loadFeed]);

  async function createPost() {
    if (!userId || !draft.trim() || submitting) return;

    setSubmitting(true);

    try {
      const { error: insertError } = await supabase
        .from('feed_posts')
        .insert({
          user_id: userId,
          body: draft.trim(),
          post_type: 'general',
        });

      if (insertError) throw insertError;

      setDraft('');
      await loadFeed(false);
    } catch (err) {
      Alert.alert(
        'Could not publish',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleLike(post: FeedPost) {
    if (!userId || busyLikeIds.includes(post.id)) return;

    setBusyLikeIds(current => [...current, post.id]);

    try {
      if (post.likedByMe) {
        const { error: deleteError } = await supabase
          .from('feed_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', userId);

        if (deleteError) throw deleteError;
      } else {
        const { error: insertError } = await supabase
          .from('feed_likes')
          .insert({
            post_id: post.id,
            user_id: userId,
          });

        if (insertError) throw insertError;
      }

      await loadFeed(false);
    } catch (err) {
      Alert.alert(
        'Like not saved',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setBusyLikeIds(current =>
        current.filter(id => id !== post.id),
      );
    }
  }

  async function openComments(post: FeedPost) {
    setActivePost(post);
    setComments([]);
    setCommentDraft('');
    setCommentsLoading(true);

    const { data, error: commentsError } = await supabase
      .from('feed_comments')
      .select(`
        id,
        post_id,
        user_id,
        body,
        created_at,
        profiles!feed_comments_user_id_fkey (
          display_name,
          avatar_url
        )
      `)
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    if (commentsError) {
      Alert.alert('Comments unavailable', commentsError.message);
    } else {
      const visibleComments = (data ?? [])
        .filter(comment =>
          !blockedUserIds.includes(comment.user_id),
        );

      setComments(visibleComments as unknown as FeedComment[]);
    }

    setCommentsLoading(false);
  }

  async function addComment() {
    if (
      !userId ||
      !activePost ||
      !commentDraft.trim() ||
      commentSubmitting
    ) {
      return;
    }

    setCommentSubmitting(true);

    try {
      const { error: insertError } = await supabase
        .from('feed_comments')
        .insert({
          post_id: activePost.id,
          user_id: userId,
          body: commentDraft.trim(),
        });

      if (insertError) throw insertError;

      setCommentDraft('');
      await openComments(activePost);
      await loadFeed(false);
    } catch (err) {
      Alert.alert(
        'Comment not saved',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setCommentSubmitting(false);
    }
  }

  function openReport(target: ReportTarget) {
    setReportTarget(target);
    setReportReason('Spam');
    setReportDetails('');
  }

  async function submitReport() {
    if (!userId || !reportTarget || reportSubmitting) return;

    if (reportTarget.userId === userId) {
      Alert.alert('Not allowed', 'You cannot report your own content.');
      return;
    }

    setReportSubmitting(true);

    try {
      const { data, error: insertError } = await supabase
        .from('reports')
        .insert({
          reporter_id: userId,
          reported_user_id: reportTarget.userId,
          content_type: reportTarget.contentType,
          content_id: reportTarget.contentId,
          reason: reportReason,
          details: reportDetails.trim() || null,
          content_snapshot: {
            body: reportTarget.body,
            author: reportTarget.author,
          },
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      const { error: notificationError } =
        await supabase.functions.invoke('notify-report', {
          body: { reportId: data.id },
        });

      setReportTarget(null);
      setReportDetails('');

      if (notificationError) {
        Alert.alert(
          'Report submitted',
          'Your report was saved, but the email notification could not be sent. The report remains available to moderators.',
        );
      } else {
        Alert.alert(
          'Report submitted',
          'Thank you. The Protlys moderation team has been notified.',
        );
      }
    } catch (err) {
      Alert.alert(
        'Report not submitted',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setReportSubmitting(false);
    }
  }

  function reportPost(post: FeedPost) {
    const author =
      post.profiles?.display_name?.trim() || 'Protlys member';

    openReport({
      contentType: 'feed_post',
      contentId: String(post.id),
      userId: post.user_id,
      body: post.body ?? '',
      author,
    });
  }

  function reportComment(comment: FeedComment) {
    const author =
      comment.profiles?.display_name?.trim() || 'Protlys member';

    openReport({
      contentType: 'feed_comment',
      contentId: String(comment.id),
      userId: comment.user_id,
      body: comment.body,
      author,
    });
  }

  function confirmBlock(userToBlock: string, author: string) {
    if (!userId || userToBlock === userId) return;

    Alert.alert(
      'Block this member?',
      `You will no longer see posts or comments from ${author}. They will also be hidden from this member's view of your community content.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block member',
          style: 'destructive',
          onPress: () => void blockUser(userToBlock, author),
        },
      ],
    );
  }

  async function blockUser(userToBlock: string, author: string) {
    if (!userId) return;

    try {
      const { error: insertError } = await supabase
        .from('blocks')
        .insert({
          blocker_id: userId,
          blocked_id: userToBlock,
        });

      if (insertError) {
        if (insertError.code === '23505') {
          Alert.alert('Already blocked', 'This member is already blocked.');
          return;
        }
        throw insertError;
      }

      setBlockedUserIds(current =>
        current.includes(userToBlock)
          ? current
          : [...current, userToBlock],
      );

      setPosts(current =>
        current.filter(post => post.user_id !== userToBlock),
      );

      if (activePost?.user_id === userToBlock) {
        setActivePost(null);
      }

      setComments(current =>
        current.filter(comment => comment.user_id !== userToBlock),
      );

      Alert.alert(
        'Member blocked',
        `${author} has been blocked.`,
      );
    } catch (err) {
      Alert.alert(
        'Could not block member',
        err instanceof Error ? err.message : 'Please try again.',
      );
    }
  }

  function showPostOptions(post: FeedPost) {
    const author =
      post.profiles?.display_name?.trim() || 'Protlys member';

    if (post.user_id === userId) {
      Alert.alert('Your post', 'This is your own post.', [
        { text: 'Close', style: 'cancel' },
      ]);
      return;
    }

    Alert.alert(
      'Post options',
      `What would you like to do with ${author}'s post?`,
      [
        {
          text: 'Report post',
          onPress: () => reportPost(post),
        },
        {
          text: 'Block member',
          style: 'destructive',
          onPress: () => confirmBlock(post.user_id, author),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }

  function showCommentOptions(comment: FeedComment) {
    const author =
      comment.profiles?.display_name?.trim() || 'Protlys member';

    if (comment.user_id === userId) return;

    Alert.alert(
      'Comment options',
      `What would you like to do with ${author}'s comment?`,
      [
        {
          text: 'Report comment',
          onPress: () => reportComment(comment),
        },
        {
          text: 'Block member',
          style: 'destructive',
          onPress: () => confirmBlock(comment.user_id, author),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }

  const renderPost = ({ item }: { item: FeedPost }) => {
    const author =
      item.profiles?.display_name?.trim() || 'Protlys member';

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <Avatar name={author} />

          <View style={styles.authorDetails}>
            <Text style={styles.authorName}>{author}</Text>
            <Text style={styles.postTime}>
              {timeAgo(item.created_at)}
            </Text>
          </View>

          <Pressable
            onPress={() => showPostOptions(item)}
            hitSlop={12}
            style={styles.optionsButton}
          >
            <Text style={styles.optionsText}>•••</Text>
          </Pressable>
        </View>

        {item.body ? (
          <Text style={styles.postBody}>{item.body}</Text>
        ) : null}

        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={styles.postImage}
            resizeMode="cover"
          />
        ) : null}

        <View style={styles.postActions}>
          <Pressable
            onPress={() => void toggleLike(item)}
            disabled={busyLikeIds.includes(item.id)}
            style={styles.actionButton}
          >
            <Text
              style={[
                styles.actionText,
                item.likedByMe && styles.likedText,
              ]}
            >
              {item.likedByMe ? '♥' : '♡'} {item.likeCount} likes
            </Text>
          </Pressable>

          <Pressable
            onPress={() => void openComments(item)}
            style={styles.actionButton}
          >
            <Text style={styles.actionText}>
              ◯ {item.commentCount} comments
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.brand}>PROTLYS</Text>
        <View style={styles.onlineDot} />
      </View>

      <FlatList
        data={posts}
        keyExtractor={item => String(item.id)}
        renderItem={renderPost}
        contentContainerStyle={styles.feedContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#6BCB45"
            colors={['#6BCB45']}
          />
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.eyebrow}>THE COMMUNITY</Text>
            <Text style={styles.title}>Your feed.</Text>
            <Text style={styles.subtitle}>
              Share your movement, progress and everyday wins.
            </Text>

            <View style={styles.composer}>
              <Text style={styles.composerTitle}>What's happening?</Text>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Share something with the community..."
                placeholderTextColor="#737973"
                multiline
                maxLength={1000}
                textAlignVertical="top"
                style={styles.composerInput}
              />

              <View style={styles.composerBottom}>
                <Text style={styles.characterCount}>
                  {draft.length}/1000
                </Text>

                <Pressable
                  onPress={() => void createPost()}
                  disabled={!draft.trim() || submitting}
                  style={[
                    styles.publishButton,
                    (!draft.trim() || submitting) &&
                      styles.disabledButton,
                  ]}
                >
                  {submitting ? (
                    <ActivityIndicator color="#0D0F0E" size="small" />
                  ) : (
                    <Text style={styles.publishText}>Post</Text>
                  )}
                </Pressable>
              </View>
            </View>

            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>LATEST POSTS</Text>
              <Text style={styles.sectionMeta}>
                {posts.length} shown
              </Text>
            </View>

            {loading ? (
              <View style={styles.stateContainer}>
                <ActivityIndicator color="#6BCB45" size="large" />
                <Text style={styles.stateText}>Loading your community...</Text>
              </View>
            ) : null}

            {!loading && error ? (
              <View style={styles.stateCard}>
                <Text style={styles.stateTitle}>Feed unavailable</Text>
                <Text style={styles.stateText}>{error}</Text>
                <Pressable
                  onPress={() => void loadFeed()}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryText}>Try again</Text>
                </Pressable>
              </View>
            ) : null}

            {!loading && !error && posts.length === 0 ? (
              <View style={styles.stateCard}>
                <Text style={styles.stateTitle}>A fresh start.</Text>
                <Text style={styles.stateText}>
                  No posts yet. Share the first update with your community.
                </Text>
              </View>
            ) : null}
          </View>
        }
        ListFooterComponent={<View style={styles.listFooter} />}
      />

      <Modal
        visible={activePost !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActivePost(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Comments</Text>
            <Pressable
              onPress={() => setActivePost(null)}
              hitSlop={12}
            >
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.commentsList}
            contentContainerStyle={styles.commentsContent}
          >
            {commentsLoading ? (
              <ActivityIndicator color="#6BCB45" size="large" />
            ) : comments.length === 0 ? (
              <Text style={styles.emptyComments}>
                No comments yet. Start the conversation.
              </Text>
            ) : (
              comments.map(comment => {
                const name =
                  comment.profiles?.display_name?.trim() ||
                  'Protlys member';

                return (
                  <View key={comment.id} style={styles.commentRow}>
                    <Avatar name={name} size={34} />
                    <View style={styles.commentBubble}>
                      <View style={styles.commentMeta}>
                        <Text style={styles.commentAuthor}>{name}</Text>
                        <Text style={styles.commentTime}>
                          {timeAgo(comment.created_at)}
                        </Text>
                      </View>

                      <Text style={styles.commentBody}>
                        {comment.body}
                      </Text>

                      {comment.user_id !== userId ? (
                        <Pressable
                          onPress={() => showCommentOptions(comment)}
                          style={styles.commentOptions}
                        >
                          <Text style={styles.commentOptionsText}>
                            Report / Block
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={styles.commentComposer}>
            <TextInput
              value={commentDraft}
              onChangeText={setCommentDraft}
              placeholder="Write a comment..."
              placeholderTextColor="#737973"
              multiline
              maxLength={500}
              style={styles.commentInput}
            />

            <Pressable
              onPress={() => void addComment()}
              disabled={!commentDraft.trim() || commentSubmitting}
              style={[
                styles.commentSend,
                (!commentDraft.trim() || commentSubmitting) &&
                  styles.disabledButton,
              ]}
            >
              {commentSubmitting ? (
                <ActivityIndicator color="#0D0F0E" size="small" />
              ) : (
                <Text style={styles.publishText}>Send</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={reportTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setReportTarget(null)}
      >
        <View style={styles.reportOverlay}>
          <View style={styles.reportCard}>
            <Text style={styles.reportTitle}>Report content</Text>
            <Text style={styles.reportSubtitle}>
              Choose the reason that best describes the issue.
            </Text>

            <ScrollView
              style={styles.reasonList}
              keyboardShouldPersistTaps="handled"
            >
              {REPORT_REASONS.map(reason => (
                <Pressable
                  key={reason}
                  onPress={() => setReportReason(reason)}
                  style={styles.reasonRow}
                >
                  <View
                    style={[
                      styles.radioOuter,
                      reportReason === reason && styles.radioSelected,
                    ]}
                  >
                    {reportReason === reason ? (
                      <View style={styles.radioInner} />
                    ) : null}
                  </View>
                  <Text style={styles.reasonText}>{reason}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <TextInput
              value={reportDetails}
              onChangeText={setReportDetails}
              placeholder="Additional details (optional)"
              placeholderTextColor="#737973"
              multiline
              maxLength={500}
              textAlignVertical="top"
              style={styles.reportInput}
            />

            <View style={styles.reportButtons}>
              <Pressable
                onPress={() => setReportTarget(null)}
                disabled={reportSubmitting}
                style={styles.reportCancel}
              >
                <Text style={styles.reportCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={() => void submitReport()}
                disabled={reportSubmitting}
                style={[
                  styles.reportSubmit,
                  reportSubmitting && styles.disabledButton,
                ]}
              >
                {reportSubmitting ? (
                  <ActivityIndicator color="#0D0F0E" size="small" />
                ) : (
                  <Text style={styles.publishText}>Submit report</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0F0E',
    paddingTop: 56,
  },
  topBar: {
    marginHorizontal: 22,
    paddingBottom: 17,
    borderBottomWidth: 1,
    borderBottomColor: '#292D29',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 3,
  },
  onlineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#6BCB45',
  },
  feedContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 30,
  },
  eyebrow: {
    color: '#6BCB45',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 9,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
  },
  subtitle: {
    color: '#A1A8A1',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
    marginBottom: 22,
  },
  composer: {
    backgroundColor: '#151815',
    borderWidth: 1,
    borderColor: '#292D29',
    borderRadius: 17,
    padding: 15,
    marginBottom: 27,
  },
  composerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
  },
  composerInput: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 21,
    minHeight: 75,
    padding: 0,
  },
  composerBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  characterCount: {
    color: '#737973',
    fontSize: 11,
  },
  publishButton: {
    minWidth: 76,
    paddingHorizontal: 19,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#6BCB45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishText: {
    color: '#0D0F0E',
    fontSize: 13,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.4,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  sectionTitle: {
    color: '#A1A8A1',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  sectionMeta: {
    color: '#737973',
    fontSize: 11,
  },
  postCard: {
    backgroundColor: '#151815',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#292D29',
    padding: 15,
    marginBottom: 13,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#263522',
    borderWidth: 1,
    borderColor: '#426D35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#8FE06D',
    fontSize: 13,
    fontWeight: '900',
  },
  authorDetails: {
    flex: 1,
    marginLeft: 11,
  },
  authorName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  postTime: {
    color: '#737973',
    fontSize: 11,
    marginTop: 3,
  },
  optionsButton: {
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  optionsText: {
    color: '#A1A8A1',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  postBody: {
    color: '#E6EAE6',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 17,
    marginBottom: 15,
  },
  postImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 14,
    backgroundColor: '#202520',
  },
  postActions: {
    borderTopWidth: 1,
    borderTopColor: '#292D29',
    paddingTop: 13,
    flexDirection: 'row',
    gap: 22,
  },
  actionButton: {
    paddingVertical: 3,
  },
  actionText: {
    color: '#A1A8A1',
    fontSize: 12,
    fontWeight: '600',
  },
  likedText: {
    color: '#6BCB45',
  },
  stateContainer: {
    paddingVertical: 35,
    alignItems: 'center',
  },
  stateCard: {
    backgroundColor: '#151815',
    borderWidth: 1,
    borderColor: '#292D29',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  stateTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 7,
  },
  stateText: {
    color: '#A1A8A1',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: '#6BCB45',
  },
  retryText: {
    color: '#0D0F0E',
    fontWeight: '900',
    fontSize: 12,
  },
  listFooter: {
    height: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0D0F0E',
    paddingTop: 20,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingBottom: 17,
    borderBottomWidth: 1,
    borderBottomColor: '#292D29',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  closeText: {
    color: '#6BCB45',
    fontSize: 13,
    fontWeight: '800',
  },
  commentsList: {
    flex: 1,
  },
  commentsContent: {
    padding: 18,
    flexGrow: 1,
  },
  emptyComments: {
    color: '#A1A8A1',
    textAlign: 'center',
    marginTop: 35,
    fontSize: 13,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 17,
  },
  commentBubble: {
    flex: 1,
    backgroundColor: '#151815',
    borderRadius: 13,
    padding: 12,
    marginLeft: 10,
  },
  commentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 7,
  },
  commentAuthor: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  commentTime: {
    color: '#737973',
    fontSize: 10,
  },
  commentBody: {
    color: '#D9DED9',
    fontSize: 13,
    lineHeight: 20,
  },
  commentOptions: {
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  commentOptionsText: {
    color: '#8FE06D',
    fontSize: 10,
    fontWeight: '800',
  },
  commentComposer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 15,
    paddingBottom: Platform.OS === 'ios' ? 28 : 15,
    borderTopWidth: 1,
    borderTopColor: '#292D29',
  },
  commentInput: {
    flex: 1,
    maxHeight: 90,
    minHeight: 42,
    color: '#FFFFFF',
    backgroundColor: '#151815',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#292D29',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  commentSend: {
    minWidth: 65,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#6BCB45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    padding: 20,
  },
  reportCard: {
    backgroundColor: '#151815',
    borderWidth: 1,
    borderColor: '#343B34',
    borderRadius: 19,
    padding: 19,
    maxHeight: '85%',
  },
  reportTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  reportSubtitle: {
    color: '#A1A8A1',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
    marginBottom: 15,
  },
  reasonList: {
    maxHeight: 230,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  radioOuter: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#858B85',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  radioSelected: {
    borderColor: '#6BCB45',
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#6BCB45',
  },
  reasonText: {
    color: '#E6EAE6',
    fontSize: 13,
  },
  reportInput: {
    minHeight: 75,
    maxHeight: 110,
    color: '#FFFFFF',
    backgroundColor: '#0D0F0E',
    borderWidth: 1,
    borderColor: '#292D29',
    borderRadius: 11,
    padding: 11,
    fontSize: 12,
    marginTop: 13,
  },
  reportButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 17,
  },
  reportCancel: {
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  reportCancelText: {
    color: '#A1A8A1',
    fontSize: 12,
    fontWeight: '800',
  },
  reportSubmit: {
    minWidth: 120,
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 20,
    backgroundColor: '#6BCB45',
    alignItems: 'center',
  },
});
