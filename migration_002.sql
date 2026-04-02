-- Migration 002: company logo and description on employer profiles
-- Run against existing database:
-- wrangler d1 execute c22-jobs --local --file=migration_002.sql
-- wrangler d1 execute c22-jobs --remote --file=migration_002.sql

ALTER TABLE users ADD COLUMN company_logo TEXT;
ALTER TABLE users ADD COLUMN company_description TEXT;
