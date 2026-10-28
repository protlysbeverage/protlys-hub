-- Rollback for block_report_terms_acceptances
drop table if exists public.terms_acceptances;
drop table if exists public.reports;
drop table if exists public.blocks;
