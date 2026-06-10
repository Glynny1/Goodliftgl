-- Migration: Switch to OpenPowerlifting username submission model
-- Run this in your Supabase SQL Editor

-- Drop and recreate with updated schema (safe since table is empty)
DROP TABLE IF EXISTS submissions;

CREATE TABLE submissions (
  id            UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  opl_username  TEXT         NOT NULL,
  -- Populated on approval from OPL data:
  first_name    TEXT,
  last_name     TEXT,
  date          DATE,
  sex           CHAR(1)      CHECK (sex IN ('M', 'F') OR sex IS NULL),
  age           SMALLINT     CHECK (age BETWEEN 13 AND 100 OR age IS NULL),
  weight_class  TEXT,
  bodyweight_kg NUMERIC(5,2) CHECK (bodyweight_kg > 0 OR bodyweight_kg IS NULL),
  squat_kg      NUMERIC(6,2),
  bench_kg      NUMERIC(6,2),
  deadlift_kg   NUMERIC(6,2),
  total_kg      NUMERIC(7,2),
  gl_points     NUMERIC(8,4),
  equipment     TEXT,
  entry_type    TEXT         DEFAULT 'competition' CHECK (entry_type IN ('gym', 'competition') OR entry_type IS NULL),
  meet_name     TEXT,
  federation    TEXT,
  status        TEXT         NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_approved
  ON submissions (status, sex, entry_type, gl_points DESC);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_approved" ON submissions
  FOR SELECT USING (status = 'approved');

CREATE POLICY "public_insert_pending" ON submissions
  FOR INSERT WITH CHECK (status = 'pending');
