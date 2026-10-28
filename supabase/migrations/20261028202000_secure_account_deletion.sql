-- Secure self-service account deletion.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  group_ids bigint[];
  challenge_ids bigint[];
  community_post_ids bigint[];
  feed_post_ids bigint[];
  event_ids bigint[];
begin
  if uid is null then raise exception 'Not authenticated'; end if;

  select coalesce(array_agg(id), '{}'::bigint[]) into group_ids from public.groups where created_by = uid and coalesce(is_system,false)=false;
  select coalesce(array_agg(id), '{}'::bigint[]) into challenge_ids from public.challenges where creator_id = uid;
  select coalesce(array_agg(id), '{}'::bigint[]) into community_post_ids from public.community_posts where user_id = uid;
  select coalesce(array_agg(id), '{}'::bigint[]) into feed_post_ids from public.feed_posts where user_id = uid;
  select coalesce(array_agg(id), '{}'::bigint[]) into event_ids from public.events where created_by = uid;

  if array_length(community_post_ids,1) is not null then
    delete from public.post_comments where post_id = any(community_post_ids);
    delete from public.post_likes where post_id = any(community_post_ids);
  end if;
  delete from public.post_comments where user_id = uid;
  delete from public.post_likes where user_id = uid;
  delete from public.community_posts where user_id = uid;

  if array_length(feed_post_ids,1) is not null then
    delete from public.feed_comments where post_id = any(feed_post_ids);
    delete from public.feed_likes where post_id = any(feed_post_ids);
  end if;
  delete from public.feed_comments where user_id = uid;
  delete from public.feed_likes where user_id = uid;
  delete from public.feed_posts where user_id = uid;

  if array_length(challenge_ids,1) is not null then
    delete from public.challenge_members where challenge_id = any(challenge_ids);
    delete from public.challenges where id = any(challenge_ids);
  end if;
  delete from public.challenge_members where user_id = uid;

  if array_length(event_ids,1) is not null then
    delete from public.event_rsvps where event_id = any(event_ids);
    delete from public.events where id = any(event_ids);
  end if;
  delete from public.event_rsvps where user_id = uid;

  if array_length(group_ids,1) is not null then
    delete from public.messages where group_id = any(group_ids);
    delete from public.weekly_results where group_id = any(group_ids);
    delete from public.challenge_members where challenge_id in (select id from public.challenges where group_id = any(group_ids));
    delete from public.challenges where group_id = any(group_ids);
    delete from public.group_members where group_id = any(group_ids);
    delete from public.groups where id = any(group_ids);
  end if;
  delete from public.group_members where user_id = uid;

  delete from public.messages where sender_id = uid;
  delete from public.cheers where from_user_id = uid or to_user_id = uid;
  delete from public.follows where follower_id = uid or following_id = uid;
  delete from public.blocks where blocker_id = uid or blocked_id = uid;
  delete from public.reports where reporter_id = uid or reported_user_id = uid;
  delete from public.terms_acceptances where user_id = uid;
  delete from public.daily_steps where user_id = uid;
  delete from public.device_tracking_tokens where user_id = uid;
  delete from public.goals where user_id = uid;
  delete from public.join_attempts where user_id = uid;
  delete from public.member_activity where user_id = uid;
  delete from public.milestones where user_id = uid;
  delete from public.notifications where user_id = uid;
  delete from public.protein_logs where user_id = uid;
  delete from public.user_achievements where user_id = uid;
  delete from public.user_points where user_id = uid;
  delete from public.weekly_results where user_id = uid;

  delete from public.profiles where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public;
revoke all on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;