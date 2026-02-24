-- Migration 007: Chat (Group Chat + Direct Messages)

-- Group chat messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  username    TEXT NOT NULL,
  content     TEXT NOT NULL CHECK (length(content) >= 1 AND length(content) <= 1000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_chat_messages_created ON public.chat_messages (created_at DESC);
CREATE INDEX idx_chat_messages_user    ON public.chat_messages (user_id);

-- DM conversation pairs
CREATE TABLE IF NOT EXISTS public.conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id         UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  user2_id         UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  last_message_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT conversations_no_self_dm CHECK (user1_id <> user2_id)
);

-- Unique index on sorted pair to prevent duplicates regardless of who initiated
CREATE UNIQUE INDEX conversations_unique_pair
  ON public.conversations (
    LEAST(user1_id::text, user2_id::text),
    GREATEST(user1_id::text, user2_id::text)
  );

CREATE INDEX idx_conversations_user1 ON public.conversations (user1_id, last_message_at DESC);
CREATE INDEX idx_conversations_user2 ON public.conversations (user2_id, last_message_at DESC);

-- Direct messages
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES public.conversations ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  receiver_id      UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  content          TEXT NOT NULL CHECK (length(content) >= 1 AND length(content) <= 1000),
  read_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX idx_dm_conversation ON public.direct_messages (conversation_id, created_at DESC);
CREATE INDEX idx_dm_receiver_unread ON public.direct_messages (receiver_id, read_at) WHERE read_at IS NULL;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.chat_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages  ENABLE ROW LEVEL SECURITY;

-- chat_messages: all authenticated users can read; only own user can insert/soft-delete
CREATE POLICY "chat_messages_select" ON public.chat_messages
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

CREATE POLICY "chat_messages_insert" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chat_messages_delete" ON public.chat_messages
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- conversations: participants only
CREATE POLICY "conversations_select" ON public.conversations
  FOR SELECT TO authenticated USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "conversations_insert" ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "conversations_update" ON public.conversations
  FOR UPDATE TO authenticated USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- direct_messages: sender/receiver only
CREATE POLICY "dm_select" ON public.direct_messages
  FOR SELECT TO authenticated USING (
    (auth.uid() = sender_id OR auth.uid() = receiver_id) AND deleted_at IS NULL
  );

CREATE POLICY "dm_insert" ON public.direct_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "dm_update_read" ON public.direct_messages
  FOR UPDATE TO authenticated USING (auth.uid() = receiver_id OR auth.uid() = sender_id);
