-- ===========================
-- FocusBond — Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ===========================

-- ========== TABLES ==========

-- 1. Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  avatar_color TEXT DEFAULT '#8b5cf6',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Friends (friend requests & accepted friendships)
CREATE TABLE friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(requester_id, receiver_id)
);

-- 3. Sessions (focus sessions)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Session Participants (per-user session tracking)
CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'ready', 'active', 'left')),
  focus_time_seconds INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  UNIQUE(session_id, user_id)
);

-- 5. Session Requests (invitations to join a session)
CREATE TABLE session_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ========== INDEXES ==========

CREATE INDEX idx_friends_requester ON friends(requester_id);
CREATE INDEX idx_friends_receiver ON friends(receiver_id);
CREATE INDEX idx_friends_status ON friends(status);
CREATE INDEX idx_sessions_created_by ON sessions(created_by);
CREATE INDEX idx_session_participants_session ON session_participants(session_id);
CREATE INDEX idx_session_participants_user ON session_participants(user_id);
CREATE INDEX idx_session_requests_receiver ON session_requests(receiver_id);
CREATE INDEX idx_session_requests_status ON session_requests(status);


-- ========== TRIGGERS ==========

-- Auto-update updated_at on profiles
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- ========== ROW LEVEL SECURITY ==========

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_requests ENABLE ROW LEVEL SECURITY;

-- PROFILES: anyone authenticated can read, only owner can update
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- FRIENDS: requester/receiver can read, requester can insert, receiver can update status
CREATE POLICY "friends_select" ON friends
  FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

CREATE POLICY "friends_insert" ON friends
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "friends_update" ON friends
  FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id);

CREATE POLICY "friends_delete" ON friends
  FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- SESSIONS: participants can read, creator can update
CREATE POLICY "sessions_select" ON sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_participants
      WHERE session_participants.session_id = sessions.id
      AND session_participants.user_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

CREATE POLICY "sessions_insert" ON sessions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "sessions_update" ON sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

-- SESSION PARTICIPANTS: users can read all participants in their session, update only own row
CREATE POLICY "session_participants_select" ON session_participants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_participants sp
      WHERE sp.session_id = session_participants.session_id
      AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "session_participants_insert" ON session_participants
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "session_participants_update" ON session_participants
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- SESSION REQUESTS: sender/receiver can read, sender can insert, receiver can update
CREATE POLICY "session_requests_select" ON session_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "session_requests_insert" ON session_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "session_requests_update" ON session_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id);


-- ========== REALTIME ==========

-- Enable realtime for session_participants (for live session updates)
ALTER PUBLICATION supabase_realtime ADD TABLE session_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE session_requests;


-- ============================================================
-- PRODUCTION PATCH (2026-03-22) -- RUN THIS SECTION ONLY
-- ============================================================
-- Purpose:
-- 1) Add missing session_participants.hidden column used by app code
-- 2) Allow session_requests.status = 'cancelled'
-- 3) Add SECURITY DEFINER helper to avoid recursive RLS checks
-- 4) Update session_requests RLS so sender can cancel and both sides can delete
--
-- This patch is intended for already-live databases.
-- It is safe to run multiple times.

BEGIN;

-- 1) Missing column used by home timeline hiding
ALTER TABLE public.session_participants
  ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_session_participants_hidden
  ON public.session_participants(hidden);

-- 2) Expand allowed statuses for session requests
ALTER TABLE public.session_requests
  DROP CONSTRAINT IF EXISTS session_requests_status_check;

ALTER TABLE public.session_requests
  ADD CONSTRAINT session_requests_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled'));

-- 3) SECURITY DEFINER helper for safe participant membership checks in policies
CREATE OR REPLACE FUNCTION public.is_session_participant(p_session_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.session_participants sp
    WHERE sp.session_id = p_session_id
      AND sp.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_session_participant(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_session_participant(UUID) TO authenticated;

-- Replace select policies with function-based checks (avoids recursive policy lookups)
DROP POLICY IF EXISTS "sessions_select" ON public.sessions;
CREATE POLICY "sessions_select" ON public.sessions
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_session_participant(id)
  );

DROP POLICY IF EXISTS "session_participants_select" ON public.session_participants;
CREATE POLICY "session_participants_select" ON public.session_participants
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_session_participant(session_id)
  );

-- 4) session_requests policy fixes for app flows
DROP POLICY IF EXISTS "session_requests_update" ON public.session_requests;
DROP POLICY IF EXISTS "session_requests_update_receiver" ON public.session_requests;
DROP POLICY IF EXISTS "session_requests_cancel_sender" ON public.session_requests;

CREATE POLICY "session_requests_update_receiver" ON public.session_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

CREATE POLICY "session_requests_cancel_sender" ON public.session_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id AND status = 'cancelled');

DROP POLICY IF EXISTS "session_requests_delete" ON public.session_requests;
CREATE POLICY "session_requests_delete" ON public.session_requests
  FOR DELETE TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

COMMIT;
