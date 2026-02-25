-- Migration 008: Subscription & Advisor System

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status  TEXT NOT NULL DEFAULT 'trial'
    CHECK (subscription_status IN ('trial','active','canceled','past_due')),
  ADD COLUMN IF NOT EXISTS subscription_tier    TEXT NOT NULL DEFAULT 'none'
    CHECK (subscription_tier IN ('none','regular','advisor')),
  ADD COLUMN IF NOT EXISTS stripe_customer_id   TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS sub_period_end       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS advisor_status       TEXT NOT NULL DEFAULT 'none'
    CHECK (advisor_status IN ('none','active','flagged','suspended')),
  ADD COLUMN IF NOT EXISTS advisor_specialty    TEXT,
  ADD COLUMN IF NOT EXISTS advisor_fee          TEXT,
  ADD COLUMN IF NOT EXISTS advisor_since        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS advisor_flagged_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS advisor_flag_reason  TEXT;
