-- Rollback for secure self-service account deletion.
revoke execute on function public.delete_my_account() from authenticated;
drop function if exists public.delete_my_account();