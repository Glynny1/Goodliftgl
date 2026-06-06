-- GoodLift GL Leaderboard Schema
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS submissions (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name    TEXT        NOT NULL,
  last_name     TEXT        NOT NULL,
  date          DATE        NOT NULL,
  sex           CHAR(1)     NOT NULL CHECK (sex IN ('M', 'F')),
  age           SMALLINT    NOT NULL CHECK (age BETWEEN 13 AND 100),
  weight_class  TEXT        NOT NULL,
  bodyweight_kg NUMERIC(5,2) NOT NULL CHECK (bodyweight_kg > 0),
  squat_kg      NUMERIC(6,2) CHECK (squat_kg >= 0),
  bench_kg      NUMERIC(6,2) CHECK (bench_kg >= 0),
  deadlift_kg   NUMERIC(6,2) CHECK (deadlift_kg >= 0),
  total_kg      NUMERIC(7,2),
  gl_points     NUMERIC(8,4),
  entry_type    TEXT        NOT NULL CHECK (entry_type IN ('gym', 'competition')),
  status        TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_submissions_approved ON submissions (status, sex, entry_type, gl_points DESC);

-- Row Level Security
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Public can read approved entries only
CREATE POLICY "public_read_approved" ON submissions
  FOR SELECT USING (status = 'approved');

-- Anyone can insert new (pending) submissions
CREATE POLICY "public_insert_pending" ON submissions
  FOR INSERT WITH CHECK (status = 'pending');

-- Service role (admin API) handles approve/reject — no extra policy needed
-- (service_role key bypasses RLS)
