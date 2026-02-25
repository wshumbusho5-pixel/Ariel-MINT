-- Add weekly email digest opt-in to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weekly_digest BOOLEAN NOT NULL DEFAULT true;
