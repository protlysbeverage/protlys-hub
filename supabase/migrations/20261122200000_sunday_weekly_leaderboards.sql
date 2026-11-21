-- Align weekly movement and leaderboard windows to Sunday 00:00–Saturday 23:59 Africa/Nairobi.
-- Keep the in-app leaderboard and Android widget on the same week boundary.

create or replace function public.get_group_leaderboard(p_group_id uuid, p_period text default 'this_week', p_limit integer default 50, p_offset integer default 0)
returns table(rank bigint, user_id uuid, username text, avatar_url text, steps bigint, last_week_rank bigint, steps_to_pass bigint, rival_username text, improvement numeric)
language plpgsql stable security definer
set search_path to ''
as $function$


CREATE OR REPLACE FUNCTION public.get_leaderboard(p_scope text, p_group_id uuid DEFAULT NULL::uuid, p_period text DEFAULT 'this_week'::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(rank bigint, user_id uuid, username text, avatar_url text, steps bigint, last_week_rank bigint, steps_to_pass bigint, rival_username text, improvement numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$


CREATE OR REPLACE FUNCTION public.finalize_weekly_results(p_week_start date DEFAULT NULL::date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$


create or replace function public.get_group_member_profile(p_user_id uuid,p_group_id uuid,p_local_date date,p_timezone text default 'Africa/Nairobi')
returns jsonb
language plpgsql stable security definer
set search_path to ''
as $function$


create or replace function public.get_member_stats(p_user_id uuid,p_scope text default 'world',p_group_id uuid default null)
returns table(username text,avatar_url text,rank bigint,steps_today bigint,estimated_distance_km numeric,weekly_wins bigint,best_week bigint,top_10_finishes bigint,climb_vs_last_week bigint,recent_activity jsonb,last_week_rank bigint)
language plpgsql stable security definer set search_path=''
as $$
declare

