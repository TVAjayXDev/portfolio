# Production Deployment Guide: T V Ajay Portfolio

This document provides a comprehensive, beginner-friendly, step-by-step walkthrough for deploying the portfolio to **Vercel** with a hardened **Supabase** backend and **Resend** transactional email dispatch.

---

## Table of Contents

1. [Step 1: Secret Scanning & Git Hygiene](#step-1-secret-scanning--git-hygiene)
2. [Step 2: Supabase Production Project Setup](#step-2-supabase-production-project-setup)
3. [Step 3: Supabase Authentication Hardening](#step-3-supabase-authentication-hardening)
4. [Step 4: Vercel Deployment & Environment Configuration](#step-4-vercel-deployment--environment-configuration)
5. [Step 5: Resend Email Service Setup](#step-5-resend-email-service-setup)
6. [Step 6: Free-Tier Keep-Alive & Cron Secret Configuration](#step-6-free-tier-keep-alive--cron-secret-configuration)
7. [Step 7: Post-Deployment Verification](#step-7-post-deployment-verification)

---

## Step 1: Secret Scanning & Git Hygiene

Before publishing your repository to GitHub or pushing any commits, verify that zero credentials, private keys, or `.env` files are tracked in git.

### 1.1 Verify `.gitignore`
Ensure `.gitignore` is present in the project root and includes rules ignoring all environment files:
```gitignore
.env
.env*.local
.env.development.local
.env.test.local
.env.production.local
.env.local
.env.*
!.env.example
```

### 1.2 Scan with Gitleaks
Install and run [Gitleaks](https://github.com/gitleaks/gitleaks) locally to audit your codebase and unstaged changes for exposed secrets:
```bash
# Using Go or standalone binary
gitleaks detect --source . -v
```
If you do not have Gitleaks installed, inspect git status manually before running `git add`:
```bash
git status
```
Confirm that `.env.local` appears under **Untracked files** or is ignored entirely, and never stages into git index.

---

## Step 2: Supabase Production Project Setup

> [!WARNING]
> **Production Isolation Recommendation:**
> Create a **fresh, dedicated Supabase project** for production. The development project (`chjoxqfxahmonjoobxhl`) had its `service_role` secret exposed to local test scripts and IDE tools during development.
> 
> *Alternative for single-project setups:* If keeping the existing project, navigate to **Project Settings &rarr; API &rarr; Project API keys** and immediately **Rotate the `service_role` secret key**.

### 2.1 Provision Database Schema
1. Log in to [supabase.com](https://supabase.com/) and create a new project (e.g., `tvajay-portfolio-prod`). Choose the AWS region closest to your primary audience (e.g., `ap-south-1` Mumbai or `us-east-1`).
2. Navigate to the **SQL Editor** in the left sidebar.
3. Open [`supabase/setup_all.sql`](file:///supabase/setup_all.sql) in your editor, copy the entire file contents, paste into the SQL Editor, and click **Run**.
4. Confirm successful execution:
   - All 11 tables (`site_settings`, `sections`, `projects`, `skills`, `education`, `experience`, `certifications`, `posts`, `messages`, `admin_users`, `auth_rate_limits`) are created with Row Level Security (RLS) enabled.
   - Storage buckets (`project-images`, `resumes`, `certificates`, `blog`) are initialized.
   - Default sections and settings are seeded.

### 2.2 Create First Administrator
Follow the steps in [`ADMIN-SETUP.md`](file:///ADMIN-SETUP.md):
1. Navigate to **Authentication &rarr; Users** in Supabase Dashboard.
2. Click **Add user &rarr; Create user**.
3. Enter email: `tvajay0@gmail.com` and a strong master password (16+ characters).
4. Set **Auto Confirm User?** to **ON**.
5. Return to the **SQL Editor** and execute:
   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users
   where email = 'tvajay0@gmail.com'
   on conflict (user_id) do nothing;
   ```

---

## Step 3: Supabase Authentication Hardening

Hardening your Supabase Auth settings ensures that unauthorized users cannot register accounts or bypass security controls.

### 3.1 Disable Public User Sign-Ups
1. In your Supabase Dashboard, navigate to **Authentication &rarr; Providers &rarr; Email**.
2. Toggle **Enable Signups** to **OFF**.
3. Toggle **Confirm email** to **ON**.
4. Click **Save**.

### 3.2 Require Multi-Factor Authentication (MFA)
1. Go to **Authentication &rarr; Policies** (or Multi-Factor Authentication tab).
2. Ensure **TOTP (Time-based One-Time Password)** is enabled.
3. The portfolio's middleware and admin layout enforce **AAL2 (Authenticator Assurance Level 2)** at the application layer.

### 3.3 Set Authorized URLs
1. Navigate to **Authentication &rarr; URL Configuration**.
2. Set **Site URL** to your Vercel production domain:
   ```
   https://your-portfolio.vercel.app
   ```
3. Add the following to **Redirect URLs**:
   ```
   https://your-portfolio.vercel.app/**
   https://your-portfolio.vercel.app/admin/login
   https://your-portfolio.vercel.app/admin/mfa/challenge
   ```

### 3.4 Password Security Policies
1. In **Authentication &rarr; Password Protection**:
   - Set minimum password length to **12 characters**.
   - Check requirements for uppercase letters, lowercase letters, numbers, and symbols.
2. Disable anonymous sign-ins.

---

## Step 4: Vercel Deployment & Environment Configuration

### 4.1 Import Repository
1. Log in to [vercel.com](https://vercel.com/) and click **Add New... &rarr; Project**.
2. Select your GitHub repository.
3. Under **Project Name**, choose your desired domain name (e.g., `tvajay-portfolio`). This will produce the live URL: `https://tvajay-portfolio.vercel.app`.
4. Framework Preset will automatically detect **Next.js**.

### 4.2 Configure Environment Variables
Add the following variables in Vercel under **Project Settings &rarr; Environment Variables**:

| Variable Name | Scope | Target Environment | Description / Example |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public / Browser | Production, Preview, Dev | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public / Browser | Production, Preview, Dev | Supabase Anonymous Client Key |
| `NEXT_PUBLIC_SITE_URL` | Public / Browser | Production | `https://tvajay-portfolio.vercel.app` (or custom domain) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-Only (Secret)** | Production, Preview, Dev | Supabase Service Role Secret Key (Never expose to browser) |
| `ADMIN_EMAIL` | Server-Only | Production, Preview, Dev | `tvajay0@gmail.com` |
| `CONTACT_IP_SALT` | **Server-Only (Secret)** | Production, Preview, Dev | Random 32+ character string (e.g. `openssl rand -hex 32`) |
| `RESEND_API_KEY` | **Server-Only (Secret)** | Production, Preview, Dev | `re_...` API key from Resend |
| `GITHUB_TOKEN` | Server-Only (Optional) | Production, Preview, Dev | Personal access token with read-only public repo access |
| `CRON_SECRET` | **Server-Only (Secret)** | Production, Preview, Dev | Random 32+ character string for Vercel Cron authentication |

> [!IMPORTANT]
> **Vercel Preview Protection:**
> Under **Project Settings &rarr; Deployment Protection**, toggle **Vercel Authentication** ON for Preview deployments so search engine crawlers and unauthorized visitors cannot access staging builds.

---

## Step 5: Resend Email Service Setup

The contact section dispatches real-time email notifications to you when visitors submit messages.

1. Sign up at [resend.com](https://resend.com/).
2. Navigate to **API Keys** &rarr; click **Create API Key**. Copy the key (`re_...`) and paste it as `RESEND_API_KEY` in Vercel.
3. **Sender Address Constraints & Free Tier Behavior:**
   - **Default Testing Mode:** On a free Resend account without a verified custom domain, emails **must** be sent from `onboarding@resend.dev` and can **only** be delivered to the email address registered on your Resend account (`tvajay0@gmail.com`).
   - **Production Custom Domain:** To send notification emails from a custom sender (e.g. `portfolio@yourdomain.com`), navigate to **Resend &rarr; Domains &rarr; Add Domain**, then add the generated MX, TXT, and DKIM DNS records to your domain DNS provider.

---

## Step 6: Free-Tier Keep-Alive & Cron Secret Configuration

Supabase free-tier database instances automatically pause after **7 consecutive days of inactivity**. To prevent interruption, this repository includes an automated keepalive system:

### 6.1 How It Works
- Endpoint: `/api/keepalive` (Method: `GET`)
- Requires HTTP Header: `Authorization: Bearer <CRON_SECRET>`
- Performs a trivial query: reads a single `id` from `public.site_settings`
- Returns: `{ ok: true }` (leaks zero database contents or schema details)
- Vercel Cron schedule defined in [`vercel.json`](file:///vercel.json):
  ```json
  {
    "crons": [
      {
        "path": "/api/keepalive",
        "schedule": "0 5 * * *"
      }
    ]
  }
  ```
  Vercel Cron automatically sends the `Authorization: Bearer <CRON_SECRET>` header if `CRON_SECRET` is set in Vercel Environment Variables.

### 6.2 Generating CRON_SECRET
Generate a 32-byte cryptographically secure random token:
```bash
# On Linux / macOS / Git Bash:
openssl rand -hex 32

# On Windows PowerShell:
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```
Add the output string as `CRON_SECRET` in Vercel Environment Variables and into your local `.env.local`.

---

## Step 7: Post-Deployment Verification

Once Vercel has built and deployed your site, execute the automated verification test suites against your deployed URL:

### 7.1 Run Smoke Tests Against Live URL
Verify that all public pages, headers, sitemap, robots.txt, dynamic OpenGraph images, and keepalive endpoint are healthy:
```bash
BASE_URL="https://your-portfolio.vercel.app" npm run test:smoke
```

### 7.2 Run Visitor Attack & Penetration Suite
Verify that Row Level Security, unpublished content isolation, honeypots, and admin redirects are strictly enforced on the live deployment:
```bash
BASE_URL="https://your-portfolio.vercel.app" npm run test:attack
```

### 7.3 Run Google Lighthouse Audit
Verify core web vitals and accessibility standards using Google Chrome DevTools or Lighthouse CLI:
```bash
npx lighthouse-ci collect --url="https://your-portfolio.vercel.app"
```
**Target Scores:**
- **Performance:** &ge; 90
- **Accessibility:** &ge; 95 (WCAG 2.1 AA)
- **Best Practices:** 100
- **SEO:** 100

### 7.4 First Admin Login & MFA Pairing
1. Open `https://your-portfolio.vercel.app/admin/login`.
2. Sign in with `tvajay0@gmail.com` and your master password.
3. You will be automatically redirected to `/admin/mfa/enroll`.
4. Open your authenticator app (Google Authenticator, Authy, or 1Password), scan the QR code, copy the manual backup secret key, and enter the 6-digit confirmation code.
5. Confirm access to the `/admin` overview dashboard.

### 7.5 Live Contact Form Dispatch
1. Open your live homepage and scroll to the Contact section.
2. Submit a test message with a valid name, email, and message.
3. Confirm that the UI displays a green success confirmation check.
4. Check your inbox (`tvajay0@gmail.com`) for the notification email delivered via Resend.
5. In `/admin/messages`, verify that the submission appears in your inbox.
