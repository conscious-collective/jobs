-- Migration 004: saved filters for seekers (job board) and employers (per-job applicant filters)
-- Run: wrangler d1 execute c22-jobs --local  --file=migration_004.sql
--      wrangler d1 execute c22-jobs --remote --file=migration_004.sql

ALTER TABLE users ADD COLUMN saved_job_filters TEXT;
ALTER TABLE jobs  ADD COLUMN saved_applicant_filter TEXT;
