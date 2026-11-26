-- Persist creator-selected challenge emoji for challenge cards and edit sheets.
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS emoji text;
