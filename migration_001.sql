-- Migration 001: add profile fields, job questions, new application fields, messages table
-- Run against existing database:
-- wrangler d1 execute c22-jobs --local --file=migration_001.sql
-- wrangler d1 execute c22-jobs --remote --file=migration_001.sql

-- Profile fields on users
ALTER TABLE users ADD COLUMN full_name TEXT;
ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users ADD COLUMN resume_url TEXT;

-- Qualifying questions on jobs
ALTER TABLE jobs ADD COLUMN questions TEXT DEFAULT '[]';

-- New application fields (NOT NULL constraints not enforced on existing rows via ALTER in SQLite)
ALTER TABLE applications ADD COLUMN full_name TEXT;
ALTER TABLE applications ADD COLUMN phone TEXT;
ALTER TABLE applications ADD COLUMN resume_url TEXT;
ALTER TABLE applications ADD COLUMN interest_statement TEXT;
ALTER TABLE applications ADD COLUMN answers TEXT DEFAULT '[]';

-- Recreate applications table to update the status CHECK constraint to include 'shortlisted'
CREATE TABLE applications_new (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  seeker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  resume_url TEXT,
  cover_letter TEXT,
  interest_statement TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  answers TEXT DEFAULT '[]',
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','reviewed','shortlisted','accepted','rejected')),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(job_id, seeker_id)
);

INSERT INTO applications_new
  SELECT id, job_id, seeker_id, full_name, phone, resume_url, cover_letter,
         interest_statement, linkedin_url, portfolio_url, answers, status, created_at
  FROM applications;

DROP TABLE applications;
ALTER TABLE applications_new RENAME TO applications;

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
