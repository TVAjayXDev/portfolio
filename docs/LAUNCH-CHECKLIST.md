# Master Launch & Quality Assurance Checklist

This document merges the pre-launch operational readiness tasks with end-to-end quality assurance procedures. Complete each numbered phase in sequence prior to pointing production DNS to the portfolio.

---

## Phase 1: Account Security & Two-Factor Authentication (2FA)

Ensure hardware or authenticator app 2FA is active on all core infrastructure accounts:

- [ ] **GitHub Account 2FA:** Enabled in GitHub Settings &rarr; Password and authentication &rarr; Two-factor authentication.
- [ ] **Vercel Account 2FA:** Enabled in Vercel Account Settings &rarr; Security &rarr; Two-Factor Authentication.
- [ ] **Supabase Account 2FA:** Enabled in Supabase Account Settings &rarr; Security &rarr; Multi-Factor Authentication.
- [ ] **Resend Account 2FA:** Enabled in Resend Account &rarr; Security settings.

---

## Phase 2: Key & Secret Management

Ensure all production secrets are generated with high entropy and isolated from development:

- [ ] **Rotate / Replace Production Keys:**
  - If using a fresh Supabase production project, populate new `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
  - If retaining an existing project, rotate `service_role` key in Supabase Dashboard &rarr; Project Settings &rarr; API.
- [ ] **Generate High-Entropy `CONTACT_IP_SALT`:**
  - Generate a 32+ character random hex or alphanumeric salt (e.g. `openssl rand -hex 32`).
  - Add to Vercel Environment Variables.
- [ ] **Generate High-Entropy `CRON_SECRET`:**
  - Generate a 32+ character random secret for the `/api/keepalive` endpoint.
  - Add to Vercel Environment Variables.
- [ ] **Configure Fine-Grained `GITHUB_TOKEN`:**
  - Generate a GitHub Personal Access Token (PAT) with read-only public repository access to enable 5,000 req/hr rate limits.
- [ ] **Confirm Zero Secret Leaks in Git:**
  - Run `git status` to ensure `.env.local` is untracked and ignored by `.gitignore`.

---

## Phase 3: Content Integrity & Fact Verification

All portfolio copy must strictly reflect verified biographical data provided by T V Ajay. No placeholder text or fabricated achievements may appear in production.

- [ ] **Complete or Delete 10th & 12th Academic Rows:**
  - In `/admin/education`, review the seeded draft rows (`10th Grade / Secondary School` and `12th Grade / Pre-University`).
  - Either fill in the verified institution name, board, completion year, and percentage/grade, or delete the rows if not desired.
- [ ] **Verify HackSpirit Year & Credentials:**
  - In `/admin/experience`, verify the date/year for the HackSpirit finalist entry against official records.
- [ ] **Upload Official Resume:**
  - Navigate to `/admin/resume` and upload the official PDF resume (`< 5 MB`).
  - Verify that the "Download Resume" buttons in the Hero section and Command Palette (`Ctrl+K`) become visible (hide-if-empty rule).
- [ ] **Upload Verified Certifications:**
  - Navigate to `/admin/certifications` and add genuine completed certifications (e.g., AWS, VTU, Coursera, DeepLearning.AI).
  - Provide title, issuer, issue date, credential ID, thumbnail, and verification link.
- [ ] **Confirm Headline & Bio:**
  - Verify `/admin/settings` displays the accurate current engineering title, university, and location.

---

## Phase 4: Media Uploads & File Validation Testing

Verify that Server Actions and direct signed-URL pipelines properly validate authentic file formats and handle ~3 MB assets:

- [ ] **Test Project Screenshot Upload (~3 MB):**
  - Select an authentic application screenshot image (`.png` or `.jpg` around 2.5 MB – 3.5 MB).
  - Upload via `/admin/projects` (TrustLens project).
  - Verify successful upload without truncation or payload size errors (configured for up to 4.5 MB).
  - Confirm image renders crisply on `/projects/trustlens`.
- [ ] **Test Blog Cover Image Upload (~3 MB):**
  - Select an authentic banner image (~3 MB) and upload via `/admin/blog` for an article.
  - Confirm image is saved in the `project-images` / blog storage bucket.
- [ ] **Verify Fake File Rejection (Signature Validation):**
  - Rename a text file `fake.png` and attempt to upload it.
  - Verify the upload is immediately rejected with an error indicating an invalid image signature (magic-byte check).
- [ ] **Verify Oversized File Rejection:**
  - Attempt to upload an image > 4 MB.
  - Verify that the client or server rejects the payload cleanly.

---

## Phase 5: Search Engines, Social Graph & Discovery

- [ ] **Canonical URL Verification:**
  - Verify `NEXT_PUBLIC_SITE_URL` in Vercel matches your custom domain or `*.vercel.app` URL.
- [ ] **Robots & Sitemap Verification:**
  - Open `https://<site-url>/robots.txt` &rarr; verify `User-agent: *`, `Disallow: /admin`, and valid `Sitemap:` directive.
  - Open `https://<site-url>/sitemap.xml` &rarr; verify valid XML containing `/`, `/projects/*`, `/blog/*`, and zero `/admin` URLs.
- [ ] **Submit Sitemap to Google Search Console:**
  - Add property in [Google Search Console](https://search.google.com/search-console).
  - Submit `https://<site-url>/sitemap.xml` and verify indexing status.
- [ ] **LinkedIn Link Preview Verification:**
  - Open [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/).
  - Enter `https://<site-url>` and click Inspect.
  - Confirm that the dynamic OpenGraph image (`/opengraph-image`), title, and description preview correctly.
  - Repeat inspection for `https://<site-url>/projects/trustlens`.
- [ ] **Twitter / X Card Preview:**
  - Test via Twitter Card Validator / Opengraph.xyz.
  - Confirm `summary_large_image` renders with full cybernetic typography.

---

## Phase 6: End-to-End Manual Quality Assurance

Perform these structured manual tests on the live deployment:

### 6.1 Viewport Responsiveness
- [ ] **375px (Mobile):** Single-column layout, hamburger menu toggles open and closed, search icon button opens Command Palette, 0 horizontal scroll.
- [ ] **768px (Tablet):** Responsive grid adjusts, navigation links transition properly.
- [ ] **1280px & 1920px (Desktop):** Full multi-column layout, wireframe renders cleanly, zero node label overlap.

### 6.2 Keyboard & Command Palette (`Ctrl+K`)
- [ ] Press `Ctrl+K` (or `Cmd+K` on Mac) &rarr; dialog opens smoothly.
- [ ] Search for projects, skills, or sections &rarr; instant fuzzy filtering.
- [ ] Use arrow keys (`↑`, `↓`) to highlight items &rarr; press `Enter` to navigate.
- [ ] Press `Escape` &rarr; dialog closes cleanly and returns focus.

### 6.3 Accessibility & WCAG 2.1 AA Compliance
- [ ] **Skip Link:** Press `Tab` on first page load &rarr; "Skip to main content" banner appears &rarr; pressing `Enter` skips to `<main>`.
- [ ] **Focus Indicators:** Cyan focus ring (`#00D9FF`) clearly visible on all buttons, links, and form fields.
- [ ] **Form Border Contrast:** All input borders (`#859398`) maintain &ge; 3:1 contrast against dark background surfaces.
- [ ] **Reduced Motion:** Enable system reduced-motion mode &rarr; animations and smooth scrolling are disabled.

### 6.4 Contact Form & Spam Prevention
- [ ] **Legitimate Submission:** Fill in name, email, and message &rarr; submit &rarr; verify success message displayed.
- [ ] **Email Receipt:** Verify notification email arrives in `tvajay0@gmail.com` via Resend.
- [ ] **Admin Inbox:** Verify submission appears in `/admin/messages`.
- [ ] **Honeypot Trap:** Programmatic bot submission with honeypot field filled is silently trapped (no email, no DB message).
- [ ] **Rate Limiting:** Attempt more than 3 submissions in 10 minutes from the same IP &rarr; verify rate limit rejection message.

### 6.5 Admin Console & AAL2 MFA Verification
- [ ] **Unauthenticated Access Blocked:** Visiting `/admin` or `/admin/settings` when logged out immediately redirects to `/admin/login`.
- [ ] **MFA Challenge Flow:** Sign in with email/password &rarr; system prompts for 6-digit TOTP code &rarr; entering code grants access.
- [ ] **Section Manager:** Test reordering sections and toggling visibility &rarr; check home page reflects changes immediately.
- [ ] **30-Minute Inactivity:** Idle admin sessions automatically log out after 30 minutes.

### 6.6 Supabase Free-Tier Keep-Alive Ping
- [ ] Test calling `GET /api/keepalive` with `Authorization: Bearer <CRON_SECRET>` &rarr; returns `{ ok: true }`.
- [ ] Call without header &rarr; returns `401 Unauthorized`.
- [ ] Confirm `vercel.json` cron schedule `0 5 * * *` is active in Vercel Dashboard &rarr; Project &rarr; Cron Jobs.

---

## Phase 7: Automated Test Suite Sign-Off

Execute all automated test suites against the live production deployment:

```bash
# Core Unit & Integration Tests (Local)
npm test

# Smoke Tests Against Live Deployment
BASE_URL="https://your-portfolio.vercel.app" npm run test:smoke

# Visitor Attack & RLS Tests Against Live Deployment
BASE_URL="https://your-portfolio.vercel.app" npm run test:attack

# Lighthouse Performance & Accessibility Audit
npx lighthouse-ci collect --url="https://your-portfolio.vercel.app"
```

Once all checklist items are checked and all tests pass with zero errors, the portfolio is officially approved for public launch.
