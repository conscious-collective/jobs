CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('employer','seeker')),
  company_name TEXT,
  company_website TEXT,
  bio TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  employer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  type TEXT NOT NULL CHECK(type IN ('Full-time','Part-time','Contract','Internship')),
  remote BOOLEAN NOT NULL DEFAULT 0,
  apply_url TEXT,
  category TEXT NOT NULL,
  description TEXT,
  tags TEXT DEFAULT '[]',
  skills TEXT DEFAULT '[]',
  status TEXT DEFAULT 'active' CHECK(status IN ('active','closed','draft','suspended')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  seeker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cover_letter TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','reviewed','accepted','rejected')),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(job_id, seeker_id)
);
