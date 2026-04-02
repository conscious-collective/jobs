# C22 Jobs

Free, open source job board for the sustainability ecosystem.

**Live:** [jobs.c22.foundation](https://jobs.c22.foundation) · **Built by:** [C22 Foundation](https://c22.space)

---

## Overview

C22 Jobs connects sustainability-focused employers with job seekers across clean energy, climate tech, ESG, environmental science, green finance, circular economy, and more.

- Employers post roles for free
- Seekers browse and apply for free
- No recruiters, no paywalls, no tracking — ever

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Astro 4 + Tailwind CSS |
| Backend | Cloudflare Pages Functions (TypeScript) |
| Database | Cloudflare D1 (SQLite-compatible) |
| Auth | Custom JWT (HMAC-SHA256, HttpOnly cookie, 30-day expiry) |
| Email | Resend (transactional only) |

---

## Features

- **Multi-role auth** — seeker, employer, admin
- **Job listings** — category, skills, remote, salary, type filters
- **Applications** — cover letter, LinkedIn URL, portfolio URL
- **Forgot / reset password** — time-limited email link via Resend
- **Admin dashboard** — manage users, jobs, applications, view stats
- **Legal pages** — Privacy Policy + Terms of Use at `/privacy` and `/terms`
- **Zero tracking** — no analytics scripts, no ad pixels, no cookies beyond auth

---

## Project Structure

```
c22-jobs/
├── src/
│   ├── pages/
│   │   ├── index.astro          # Job board homepage
│   │   ├── view.astro           # Job detail
│   │   ├── apply.astro          # Job application form
│   │   ├── auth.astro           # Sign in / sign up
│   │   ├── forgot-password.astro
│   │   ├── reset-password.astro
│   │   ├── about.astro
│   │   ├── privacy.astro
│   │   ├── terms.astro
│   │   ├── admin/               # Admin dashboard pages
│   │   ├── employer/            # Employer dashboard + job posting
│   │   └── seeker/              # Seeker dashboard
│   ├── components/
│   │   ├── Nav.astro
│   │   └── Footer.astro
│   └── layouts/
│       └── BaseLayout.astro
├── functions/
│   └── api/
│       ├── _lib/
│       │   ├── cors.ts
│       │   ├── jwt.ts
│       │   └── password.ts      # PBKDF2-SHA256 hashing
│       ├── auth/                # signup · signin · signout · me
│       │   ├── forgot-password.ts
│       │   └── reset-password.ts
│       ├── jobs/                # list + detail
│       ├── applications/        # create + list
│       ├── employer/            # employer-scoped routes
│       ├── seeker/              # seeker-scoped routes
│       └── admin/               # admin routes + stats
├── schema.sql                   # D1 database schema
└── wrangler.toml                # Cloudflare config
```

---

## Local Development

```bash
npm install
```

Create `.dev.vars` in the project root:

```ini
JWT_SECRET=any-local-secret-min-32-chars
RESEND_API_KEY=re_your_key_here
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-admin-password
```

Apply the schema to local D1:

```bash
npx wrangler d1 execute c22-jobs --local --file=schema.sql
```

Start the dev server:

```bash
npm run dev
```

---

## Database

The project uses **Cloudflare D1** (`c22-jobs`).

```bash
# Create the database (first time only)
npx wrangler d1 create c22-jobs

# Apply schema — local
npx wrangler d1 execute c22-jobs --local --file=schema.sql

# Apply schema — production
npx wrangler d1 execute c22-jobs --remote --file=schema.sql
```

### Schema overview

| Table | Purpose |
|---|---|
| `users` | Accounts (seeker + employer + admin) |
| `jobs` | Job listings posted by employers |
| `applications` | Seeker applications to jobs |
| `password_reset_tokens` | Time-limited tokens for password reset (1hr expiry) |

---

## Deployment

```bash
npm run deploy
```

### Secrets (set once per project)

```bash
npx wrangler pages secret put JWT_SECRET --project-name c22-jobs
npx wrangler pages secret put RESEND_API_KEY --project-name c22-jobs
npx wrangler pages secret put ADMIN_EMAIL --project-name c22-jobs
npx wrangler pages secret put ADMIN_PASSWORD --project-name c22-jobs
```

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | Signs and verifies auth tokens |
| `RESEND_API_KEY` | Delivers password reset emails |
| `ADMIN_EMAIL` | Admin account email |
| `ADMIN_PASSWORD` | Admin account password |

---

## API Routes

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | — | Register seeker or employer |
| POST | `/api/auth/signin` | — | Sign in, sets token cookie |
| POST | `/api/auth/signout` | — | Clears token cookie |
| GET | `/api/auth/me` | cookie | Current user info |
| POST | `/api/auth/forgot-password` | — | Send reset email |
| POST | `/api/auth/reset-password` | — | Set new password via token |
| GET | `/api/jobs` | — | List active job listings |
| GET | `/api/jobs/[id]` | — | Single job detail |
| POST | `/api/applications` | seeker | Submit application |
| GET | `/api/applications` | seeker | Seeker's applications |
| GET | `/api/employer/jobs` | employer | Employer's listings |
| GET | `/api/employer/applicants/[job_id]` | employer | Applicants for a job |
| GET | `/api/seeker/applications` | seeker | Seeker dashboard data |
| GET | `/api/admin/stats` | admin | Platform statistics |
| GET/PATCH/DELETE | `/api/admin/jobs/[id]` | admin | Manage a job |
| GET/PATCH/DELETE | `/api/admin/users/[id]` | admin | Manage a user |

---

## Contributing

Standard GitHub flow — fork, branch, pull request. The project is open source; feel free to adapt it for your own niche job board.

---

Built by [C22 Foundation](https://c22.space) — boutique deep tech & sustainability agency.
