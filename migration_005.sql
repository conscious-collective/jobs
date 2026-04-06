-- Migration 005: slug column for human-readable job URLs
-- Run: wrangler d1 execute c22-jobs --remote --file=migration_005.sql

ALTER TABLE jobs ADD COLUMN slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS jobs_slug_idx ON jobs(slug) WHERE slug IS NOT NULL;
