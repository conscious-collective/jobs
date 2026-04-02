-- Migration 003: richer seeker + employer profile fields
-- Run: wrangler d1 execute c22-jobs --local  --file=migration_003.sql
--      wrangler d1 execute c22-jobs --remote --file=migration_003.sql

-- Seeker profile enrichment
ALTER TABLE users ADD COLUMN avatar TEXT;
ALTER TABLE users ADD COLUMN location TEXT;
ALTER TABLE users ADD COLUMN years_experience TEXT;
ALTER TABLE users ADD COLUMN linkedin_url TEXT;
ALTER TABLE users ADD COLUMN portfolio_url TEXT;
ALTER TABLE users ADD COLUMN skills TEXT DEFAULT '[]';
ALTER TABLE users ADD COLUMN open_to_work INTEGER DEFAULT 0;

-- Employer profile enrichment
ALTER TABLE users ADD COLUMN company_size TEXT;
ALTER TABLE users ADD COLUMN company_hq TEXT;
