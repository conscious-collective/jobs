CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('employer','seeker')),
  -- shared
  full_name TEXT,
  phone TEXT,
  avatar TEXT,
  bio TEXT,
  location TEXT,
  -- seeker-specific
  resume_url TEXT,
  years_experience TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  skills TEXT DEFAULT '[]',
  open_to_work INTEGER DEFAULT 0,
  -- employer-specific
  company_name TEXT,
  company_website TEXT,
  company_logo TEXT,
  company_description TEXT,
  company_size TEXT,
  company_hq TEXT,
  saved_job_filters TEXT,
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
  questions TEXT DEFAULT '[]',
  salary TEXT,
  saved_applicant_filter TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','closed','draft','suspended')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  seeker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  resume_url TEXT NOT NULL,
  cover_letter TEXT,
  interest_statement TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  answers TEXT DEFAULT '[]',
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','reviewed','shortlisted','accepted','rejected')),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(job_id, seeker_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
