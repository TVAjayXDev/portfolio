# T V Ajay — Developer Portfolio & Content Platform

A high-performance developer portfolio and headless content management platform engineered for **T V Ajay** (Computer Science & Engineering student). Built with modern full-stack web standards, featuring cybernetic dark-mode aesthetics, dynamic OpenGraph generation, accessible user interactions (WCAG 2.1 AA compliant), and an integrated administrative console protected by Supabase Multi-Factor Authentication (AAL2 TOTP).

---

## ⚡ Tech Stack

- **Core Framework:** [Next.js 14+](https://nextjs.org/) (App Router, React Server Components, Server Actions)
- **Language:** [TypeScript 5](https://www.typescriptlang.org/) (Strict Mode)
- **Styling & UI:** [Tailwind CSS](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/), [Lucide React](https://lucide.dev/)
- **Database & Storage:** [Supabase](https://supabase.com/) (PostgreSQL 15+, Row Level Security, Storage Buckets)
- **Authentication:** Supabase Auth with mandatory Authenticator Assurance Level 2 (AAL2) TOTP MFA
- **Email Dispatch:** [Resend](https://resend.com/) REST API with rate-limiting and honeypot spam protection
- **Testing & Verification:** Node.js native test runner (`node:test`), Playwright (Edge/Chromium), Axe-Core accessibility audits, Lighthouse

---

## 📁 Repository Structure

```
.
├── docs/                       # Architecture, deployment, and security guides
│   ├── DEPLOYMENT.md           # Step-by-step production deployment guide
│   ├── BACKUP-AND-ROLLBACK.md  # Database export, rollback, and migration protocol
│   ├── LAUNCH-CHECKLIST.md     # Ordered pre-launch verification checklist
│   └── MANUAL-QA.md            # Interactive end-to-end quality assurance guide
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── (public)/           # Home, project deep-dives, blog, open-graph routes
│   │   ├── admin/              # Secured administrative dashboard and CMS managers
│   │   │   ├── login/          # Master password authentication
│   │   │   ├── mfa/            # TOTP enrolment and challenge elevation
│   │   │   ├── settings/       # Global site settings & profile data
│   │   │   ├── sections/       # Drag-and-drop section order & visibility
│   │   │   ├── projects/       # Project case studies & showcase manager
│   │   │   ├── skills/         # Technical skills matrix manager
│   │   │   ├── education/      # Academic timeline manager
│   │   │   ├── experience/     # Work & leadership experience manager
│   │   │   ├── certifications/ # Verified certifications & credentials manager
│   │   │   ├── blog/           # Technical article authoring & publishing
│   │   │   └── messages/       # Visitor contact submissions viewer
│   │   └── api/                # Backend API endpoints (keepalive, contact, auth)
│   ├── components/             # Reusable React components & layout elements
│   │   ├── sections/           # Modular page sections (Hero, About, Projects, etc.)
│   │   └── ui/                 # UI primitives (Command Palette, Modals, Buttons)
│   └── lib/                    # Core utilities, validation schemas, and Supabase clients
├── supabase/                   # Database migrations and initialization scripts
│   ├── migrations/             # Timestamped SQL migrations (forward-only)
│   └── setup_all.sql           # Complete schema bootstrap script
├── tests/                      # Automated test suites (CRUD, uploads, security, SEO)
├── .env.example                # Canonical environment variable specification
├── next.config.mjs             # Next.js configuration and CSP security headers
└── vercel.json                 # Vercel deployment and cron job configuration
```

---

## 🛠️ Local Setup & Development

### 1. Prerequisites
- **Node.js**: v18.17.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **Supabase Account**: A free or pro Supabase cloud project

### 2. Clone & Install Dependencies
```bash
git clone <repository-url>
cd "final portfolio"
npm install
```

### 3. Environment Configuration
Copy [.env.example](file:///.env.example) to `.env.local`:
```bash
cp .env.example .env.local
```
Configure the variables in `.env.local` with your development Supabase credentials, Resend API key, contact salt, and cron secret. **Never commit `.env.local` to git.**

### 4. Database Bootstrap
1. Open your [Supabase Project Dashboard](https://supabase.com/dashboard).
2. Go to the **SQL Editor**.
3. Copy the entire contents of [supabase/setup_all.sql](file:///supabase/setup_all.sql) and click **Run**.
4. Create your initial administrator account by following [ADMIN-SETUP.md](file:///ADMIN-SETUP.md).

### 5. Run the Local Development Server
```bash
npm run dev
```
Visit `http://localhost:3000` in your browser. The administrative portal is located at `http://localhost:3000/admin`.

---

## 📜 Available NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server with hot reloading on port 3000 |
| `npm run build` | Compiles the production build with TypeScript check and bundle optimization |
| `npm run start` | Runs the compiled production server locally |
| `npm run lint` | Runs Next.js ESLint checks |
| `npm test` | Runs the core automated test suite (CRUD, uploads, contact, SEO) |
| `npm run test:smoke` | Runs production smoke tests (accepts optional `BASE_URL=<url>`) |
| `npm run test:attack` | Runs visitor attack and RLS penetration tests (accepts optional `BASE_URL=<url>`) |
| `npm run test:all` | Executes unit, smoke, and security attack test suites sequentially |

---

## 🔒 Content Management via `/admin`

The administrative console provides complete real-time control over portfolio content without requiring code modifications or redeployments:

1. **Authentication & Multi-Factor Security (`/admin/login`, `/admin/mfa`):**
   - Single master administrator email (`tvajay0@gmail.com`).
   - Strict AAL2 elevation required; un-enrolled sessions are immediately routed to QR code pairing.
   - Automatic 30-minute idle session revocation.

2. **Site Settings (`/admin/settings`):**
   - Full control over hero headline, bio markdown, location, contact email, GitHub URL, LinkedIn URL, and resume document URL.

3. **Section Visibility & Reordering (`/admin/sections`):**
   - Drag-and-drop ordering for all 12 page sections.
   - Real-time toggles to hide or display sections.
   - Built-in "hide-if-empty" guardrails ensure empty collections (e.g., certifications or blog posts) never display blank UI cards to visitors.

4. **Projects Showcase (`/admin/projects`):**
   - Add, edit, or archive project case studies.
   - Assign primary project tags, architecture descriptions, repository links, live demo URLs, and featured flags.
   - Upload screenshots up to 4 MB with authentic PNG/JPEG signature validation.

5. **Technical Skills Matrix (`/admin/skills`):**
   - Categorize skills (Languages, Frameworks, Developer Tools, Core Concepts) with custom proficiency levels and sort orders.

6. **Academic & Professional Timelines (`/admin/education`, `/admin/experience`):**
   - Manage university degrees, coursework, high school credentials, and work history.

7. **Certifications & Credentials (`/admin/certifications`):**
   - Upload certificate thumbnails, assign issuing organizations, credential IDs, and direct verification URLs.

8. **Technical Blog (`/admin/blog`):**
   - Integrated Markdown authoring with live preview, custom slug assignment, and cover image uploads.

9. **Contact Messages (`/admin/messages`):**
   - Review incoming messages dispatched through the visitor contact form with status markers and timestamps.

---

## 🛡️ Security & Privacy Architecture

- **Row Level Security (RLS):** All database tables have RLS enabled. Unauthenticated visitors can only execute `SELECT` queries on explicitly published content (`is_published = true`). All mutation operations require authenticated service role or AAL2 admin privileges.
- **File Upload Protection:** All uploaded assets undergo magic-byte signature validation to ensure uploaded files match authentic PDF, PNG, JPEG, or WebP binary headers.
- **Privacy-Preserving Rate Limiting:** Visitor IP addresses are combined with a high-entropy secret salt (`CONTACT_IP_SALT`) and hashed using SHA-256 before checking rate limits. Raw visitor IP addresses are never persisted in the database.
- **Free-Tier Inactivity Keep-Alive:** The `/api/keepalive` endpoint accepts authenticated pings (`Authorization: Bearer CRON_SECRET`) triggered daily by Vercel Cron to keep the Supabase database instance active.

---

## 📖 Deployment & Operational Guides

- [Deployment Guide](file:///docs/DEPLOYMENT.md) — Comprehensive, beginner-friendly instructions for deploying to Vercel and configuring Supabase.
- [Launch Checklist](file:///docs/LAUNCH-CHECKLIST.md) — Consolidated pre-flight operational steps and manual QA verification.
- [Backup & Rollback Guide](file:///docs/BACKUP-AND-ROLLBACK.md) — Data export workflows, forward migrations, and instant recovery procedures.
- [Administrator Setup Guide](file:///ADMIN-SETUP.md) — First-time admin onboarding and emergency TOTP recovery instructions.
