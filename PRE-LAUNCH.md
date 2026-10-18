# Pre-Launch Verification Checklist

This document tracks all temporary stubs, placeholders, and operational steps that must be finalized before pointing production traffic to this portfolio.

---

### 1. Functional Modules & Stubs

- [ ] **Contact Form Message Dispatch (Stage 8)**
  - *Current State:* Temporary client-side stub displaying `"Message Pipeline Offline (Live in Stage 8)"`.
  - *Required Action:* Connect contact form to Supabase `messages` table with check constraints, honeypot spam protection, rate limiting, and Resend/SendGrid email notification.
  - *File:* `src/components/sections/ContactSection.tsx`

- [ ] **GitHub Access Token (Stage 4)**
  - *Current State:* Unauthenticated GitHub REST API calls (limited to 60 req/hour per IP).
  - *Required Action:* Add a fine-grained GitHub personal access token (public repos read-only, no extra scopes required) to Vercel environment variables as `GITHUB_TOKEN` to unlock 5,000 req/hour.

- [ ] **Resume Upload (Stage 7)**
  - *Current State:* `site_settings.resume_url` is `null`. The "Download Resume" buttons in the Hero and Ctrl+K palette remain completely hidden per the hide-if-empty rule.
  - *Required Action:* Upload the official PDF resume from the Admin Dashboard to populate `resume_url`.

- [ ] **Education Draft Rows (10th & 12th)**
  - *Current State:* Seeded as unpublished drafts (`is_published = false`) with `null` years, institution, and grades.
  - *Required Action:* Log into the Admin Dashboard, fill in the real school/college name, board, year of completion, and percentage/grade, then publish the rows.

- [ ] **Certifications & Blog Content**
  - *Current State:* 0 published certificates and 0 published articles. Both sections and their nav links are cleanly hidden.
  - *Required Action:* Add initial verified certificates (AWS, VTU, course completions) and publish introductory technical writeups from the Admin Dashboard.

- [ ] **Project Screenshots**
  - *Current State:* `image_url` is `null` for TrustLens. A screenshot frame is not rendered unless an image URL is populated.
  - *Required Action:* Upload an application screenshot from the TrustLens live deployment into the `project-images` storage bucket in Admin.

---

### 2. Infrastructure & Security Settings

- [x] **Supabase Auth Configuration & Admin User**
  - Created admin user in Supabase Auth: `tvajay0@gmail.com` (UID: `339d18b2-2aff-482e-968d-cfab8ea4a357`).
  - Linked into `public.admin_users` table.
  - Deployed full schema and migrations through `20261017000002_admin_mfa_aal2.sql`.
  - *Hardening steps:* Disable public user sign-ups, disable anonymous sign-ins, enable refresh token rotation, set JWT expiry to 1 hour or less.

- [ ] **MFA TOTP Enrollment**
  - Sign in to `/admin/login` and navigate to `/admin/mfa/enroll`.
  - Scan the TOTP QR code using Google Authenticator, Authy, or 1Password.
  - Enter the 6-digit confirmation code. Once enrolled, all subsequent logins strictly enforce AAL2 step-up elevation at `/admin/mfa/challenge`.

- [ ] **Storage Buckets & RLS**
  - Confirm `certificates`, `resumes`, and `project-images` buckets exist with public reads enabled for direct asset URLs, but `SELECT` on `storage.objects` restricted to admin only (prevents bucket listing).

- [ ] **Environment Variables on Vercel**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (admin-only operations)
  - `GITHUB_TOKEN` (optional, for rate-limit protection)
  - `RESEND_API_KEY` or `SMTP_URL` (Stage 8)

- [ ] **Supabase Free Tier Keep-Alive Ping**
  - *Context:* Supabase free-tier projects automatically pause after 7 consecutive days of inactivity.
  - *Required Action:* Set up a free daily scheduled ping using either:
    1. **GitHub Action** (`.github/workflows/supabase-keep-alive.yml`): Runs on a cron schedule (`0 0 */3 * *`) to perform a GET request against the public site or a database health endpoint.
    2. **Vercel Cron** (`vercel.json`): Pings an endpoint like `/api/keep-alive` every 48 hours to ensure constant database activity.

---

### 3. Design & Telemetry Guardrails

- [x] Background color set to `#111118` (matches cybernetic specification).
- [x] Zero invented metrics or benchmark scores (e.g. no "Top Decile").
- [x] TrustLens case study disclaimers prominent: *"Illustrative example, synthetic demo data; does not constitute clinical guidance"*.
- [x] Real identity verified: T V Ajay, Computer Science Engineering Student.
