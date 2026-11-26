drop function if exists public.ensure_my_referral_code();
drop function if exists public.record_referral_visit(text, text);
drop function if exists public.claim_referral_code(text);
drop function if exists public.get_my_referral_stats();
drop function if exists public.submit_support_request(text, text, text, text);

drop table if exists public.referral_visits;
drop table if exists public.referrals;
drop table if exists public.support_requests;
