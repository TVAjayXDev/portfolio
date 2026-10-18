# Manual Quality Assurance & Verification Guide

This document provides a comprehensive, end-to-end testing protocol for the **T V Ajay Personal Portfolio** web application. Follow these structured procedures to verify functionality across public visitor flows, administrative operations, multi-factor authentication, media uploads, contact messaging, and accessibility compliance.

---

## Prerequisites & Test Environment

1. **Local Server Setup**:
   Ensure dependencies are installed and the application is built in production mode:
   ```bash
   npm run build
   npm run start
   ```
   *Default port*: `http://localhost:3000` (or configured `$PORT`).

2. **Environment Configuration**:
   Verify `.env.local` is present with active Supabase credentials and Resend API key.

3. **Required Testing Tools**:
   - Modern browser (Chromium/Chrome, Edge, Firefox, or Safari).
   - Mobile viewport emulator or physical device.
   - TOTP Authenticator application (e.g. Google Authenticator, 1Password, or Authy).
   - Sample test files:
     - Authentic PDF file (< 5 MB).
     - Fake PDF (text file renamed to `.pdf`).
     - Oversized PDF (> 5 MB).
     - Authentic image (`.png`, `.jpg`, or `.webp` < 10 MB).
     - Oversized image (> 10 MB).

---

## Test Protocol Index

1. [Section 1: Public Experience & Navigation](#section-1-public-experience--navigation)
2. [Section 2: Accessibility & Usability (WCAG 2.1 AA)](#section-2-accessibility--usability-wcag-21-aa)
3. [Section 3: Empty State Verification (`?empty=1`)](#section-3-empty-state-verification-empty1)
4. [Section 4: Case Studies & Project Details](#section-4-case-studies--project-details)
5. [Section 5: Contact Form, Honeypot & Rate Limiting](#section-5-contact-form-honeypot--rate-limiting)
6. [Section 6: Admin Authentication & MFA Enforcement](#section-6-admin-authentication--mfa-enforcement)
7. [Section 7: Admin CRUD Operations](#section-7-admin-crud-operations)
8. [Section 8: File Uploads & Storage Protection](#section-8-file-uploads--storage-protection)
9. [Section 9: Error Handling & 404 Pages](#section-9-error-handling--404-pages)
10. [Section 10: Security & Header Verification](#section-10-security--header-verification)

---

## Section 1: Public Experience & Navigation

### 1.1 Responsive Viewport Adaptability
- **Steps**:
  1. Open `http://localhost:3000/`.
  2. Resize browser viewport across 375px (Mobile), 768px (Tablet), 1280px (Laptop), and 1920px (Desktop).
- **Expected Outcome**:
  - Content flows naturally with zero horizontal overflow/scrolling.
  - Header displays a hamburger toggle menu on screens < 768px and inline links on screens ≥ 768px.
  - Interactive grid elements collapse to single-column on mobile viewports.

### 1.2 Command Palette (`Ctrl+K` / `Cmd+K`)
- **Steps**:
  1. On any public page, press `Ctrl+K` (Windows/Linux) or `Cmd+K` (macOS).
  2. Alternatively, click the floating "⌘K" button in the lower viewport.
  3. Type search queries (e.g., `"trustlens"`, `"skills"`, `"contact"`).
  4. Use the arrow keys (`↑`, `↓`) to navigate between filtered results.
  5. Press `Enter` on a result.
  6. Reopen palette and press `Escape`.
- **Expected Outcome**:
  - Modal dialog opens smoothly with `role="dialog"` and `aria-modal="true"`.
  - Focus is immediately trapped inside the search input.
  - Fuzzy search instantly highlights and ranks matching destinations.
  - Pressing `Enter` closes the palette and navigates directly to the anchor/page.
  - Pressing `Escape` closes the modal and returns focus to the initiating element.

---

## Section 2: Accessibility & Usability (WCAG 2.1 AA)

### 2.1 Skip Link
- **Steps**:
  1. Reload `http://localhost:3000/`.
  2. Press the `Tab` key once without clicking anywhere on the page.
- **Expected Outcome**:
  - A prominent "Skip to main content" banner slides into view at the top of the viewport.
  - Pressing `Enter` jumps keyboard focus directly to `<main id="main-content">`, bypassing navigation headers.

### 2.2 Focus Indicators
- **Steps**:
  1. Tab through interactive elements (navigation links, buttons, form controls).
- **Expected Outcome**:
  - Every focused element displays a high-contrast cyan focus ring (`outline: 2px solid #00D9FF` with `2px` offset).
  - Outline is visible against dark surfaces without color clipping.

### 2.3 Reduced Motion Mode
- **Steps**:
  1. In operating system settings, toggle "Reduce motion" / "Turn off animations".
  2. Reload and navigate the site.
- **Expected Outcome**:
  - `@media (prefers-reduced-motion: reduce)` disables smooth scrolling transitions, pulsating pings, and transform-based scale animations.

---

## Section 3: Empty State Verification (`?empty=1`)

- **Steps**:
  1. Navigate to `http://localhost:3000/?empty=1`.
- **Expected Outcome**:
  - Only the Hero and Contact sections are displayed.
  - Header navigation bar contains no ghost links (About, Skills, Projects, Blog are hidden).
  - Command palette (`Ctrl+K`) excludes unpopulated sections.
  - Footer navigation links for empty sections are omitted.
  - Structured Data (`application/ld+json`) contains an empty educational profile without broken schema nodes.

---

## Section 4: Case Studies & Project Details

### 4.1 Case Study Rendering
- **Steps**:
  1. Navigate to `http://localhost:3000/projects/trustlens`.
- **Expected Outcome**:
  - Page renders breadcrumb: `Back to all projects / Projects / TrustLens`.
  - Displays status badge (`Live Production`), team badge (`Cache Me Outside`), title, and tagline.
  - Renders mandatory clinical disclaimer:
    > **Notice:** The live deployment uses synthetic demonstration data and does not constitute clinical guidance.
  - Case study Markdown is sanitized via `rehype-sanitize` with headings, lists, and callout blocks formatted cleanly.
  - Page head contains `<meta name="robots" content="index, follow" />` and canonical URL pointing to `/projects/trustlens`.

### 4.2 Empty Case Study Fallback
- **Steps**:
  1. Navigate to a published project with null content (e.g. `/projects/campuslink`).
- **Expected Outcome**:
  - Displays `"Detailed case study in preparation."` placeholder.
  - Page head emits `<meta name="robots" content="noindex, nofollow" />` to prevent search engine indexing of stub pages.

---

## Section 5: Contact Form, Honeypot & Rate Limiting

### 5.1 Valid Message Submission
- **Steps**:
  1. Navigate to `#contact` on the homepage.
  2. Fill in Name, Email (`tester@example.com`), and Message (> 10 characters).
  3. Wait at least 3 seconds before clicking "Send Message".
- **Expected Outcome**:
  - Form transitions to success state: `"Message Delivered"`.
  - Row is inserted into Supabase `messages` table with status `unread`.
  - Notification email is dispatched via Resend (if configured).

### 5.2 Bot Trap: Honeypot Protection
- **Steps**:
  1. In browser Developer Tools, inspect the contact form.
  2. Locate the hidden honeypot input field (`company_website` or `fax_number`).
  3. Enter any text into this field and click "Send Message".
- **Expected Outcome**:
  - The UI simulates success without error to mislead automated bots.
  - No record is inserted into the Supabase database and no email is sent.

### 5.3 Speed Trap: Minimum Fill Time
- **Steps**:
  1. Reload the page.
  2. Using an automated autofill tool or rapid script, fill the form and click "Send Message" in less than 2 seconds.
- **Expected Outcome**:
  - Request is rejected by the server route with an invalid fill time error.

### 5.4 Rate Limiting & Denial of Service Defense
- **Steps**:
  1. Submit 3 consecutive valid messages within 10 minutes from the same IP.
  2. Attempt a 4th submission.
- **Expected Outcome**:
  - Server responds with HTTP `429 Too Many Requests`.
  - UI displays rate limit message with direct email link (`mailto:tvajay0@gmail.com`).

---

## Section 6: Admin Authentication & MFA Enforcement

### 6.1 Brute Force Throttling
- **Steps**:
  1. Navigate to `http://localhost:3000/admin/login`.
  2. Enter incorrect password 5 times consecutively.
- **Expected Outcome**:
  - Subsequent login attempts are locked out by the database rate limiter with a countdown message.

### 6.2 MFA Enrollment (AAL1 -> AAL2)
- **Steps**:
  1. Sign in with valid admin credentials.
  2. If MFA is not yet configured, user is directed to `/admin/mfa/enroll`.
  3. Scan the generated QR code or copy the secret key into your TOTP Authenticator.
  4. Submit a valid 6-digit TOTP code.
- **Expected Outcome**:
  - Verification succeeds and grants an `aal2` elevated session.
  - Redirects to `/admin`.

### 6.3 MFA Session Verification
- **Steps**:
  1. Open a new incognito window, log in with password only, and try navigating directly to `/admin/settings` or `/admin/projects`.
- **Expected Outcome**:
  - Application intercepts request and forces redirect to `/admin/mfa/challenge`.
  - No administrative read or write action executes without verified `aal2` status.

---

## Section 7: Admin CRUD Operations

### 7.1 Site Settings & About
- **Steps**:
  1. Navigate to `/admin/settings`.
  2. Edit Headline, Subtitle, or About text.
  3. Save changes.
  4. Visit the public homepage (`/`).
- **Expected Outcome**:
  - Database updates successfully.
  - Public page reflects the updated copy immediately due to server action revalidation.

### 7.2 Projects Management
- **Steps**:
  1. Navigate to `/admin/projects`.
  2. Create a new project with title, unique slug, and markdown content.
  3. Check "Featured Project".
  4. Save.
- **Expected Outcome**:
  - Only one project retains `is_featured = true` (enforced by partial unique index).
  - Slug is validated as URL-safe.
  - Javascript URLs (e.g. `javascript:alert(1)`) are rejected by server Zod schema.

### 7.3 Section Ordering & Visibility
- **Steps**:
  1. Navigate to `/admin/sections`.
  2. Toggle visibility on/off for a section.
  3. Adjust numerical sort orders.
  4. Verify homepage layout.
- **Expected Outcome**:
  - Sections display in specified sort order.
  - Hidden sections disappear from both the page flow and the navigation bar.

---

## Section 8: File Uploads & Storage Protection

### 8.1 Resume Upload
- **Steps**:
  1. Navigate to `/admin/resume`.
  2. Upload an authentic PDF (< 5 MB).
  3. Upload an invalid file (e.g., a `.txt` renamed to `.pdf`).
  4. Upload an oversized PDF (> 5 MB).
- **Expected Outcome**:
  - Browser uploads authentic PDF directly to Supabase storage via signed upload URL.
  - Finalize action inspects byte signature (`%PDF-`), confirms MIME type `application/pdf`, and updates `site_settings.resume_url`.
  - Renamed fake PDF fails magic byte check and is immediately purged from storage.
  - Oversized PDF is rejected by client validator and bucket limits.

### 8.2 Certificates Upload
- **Steps**:
  1. Navigate to `/admin/certifications`.
  2. Add a certification and attach an image (`.png` / `.jpg` / `.webp` < 10 MB).
- **Expected Outcome**:
  - File signature is validated (`89 50 4E 47` for PNG, `FF D8 FF` for JPEG, `RIFF....WEBP` for WebP).
  - Image preview displays in admin and public certifications section.

### 8.3 Unused Files Cleanup
- **Steps**:
  1. In `/admin/resume` or `/admin/certifications`, trigger "Remove Unused Files".
- **Expected Outcome**:
  - Server identifies orphan storage objects not referenced in database records and safely deletes them.

---

## Section 9: Error Handling & 404 Pages

- **Steps**:
  1. Navigate to a nonexistent URL (e.g. `http://localhost:3000/non-existent-page`).
- **Expected Outcome**:
  - Displays custom branded 404 page styled with site aesthetic.
  - Header and footer remain accessible.
  - Link provides direct route back to `"Return Home"`.
  - HTTP status code returned is `404 Not Found`.

---

## Section 10: Security & Header Verification

- **Steps**:
  1. Open browser Developer Tools -> Network tab.
  2. Request `http://localhost:3000/` and inspect response headers.
  3. Request `http://localhost:3000/admin` and inspect response headers.
- **Expected Outcome**:
  - Public responses include:
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: DENY`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Content-Security-Policy`: Restricts scripts, objects, and framing.
  - Admin responses include:
    - `X-Robots-Tag: noindex, nofollow`
  - Neither client JS bundles nor public HTML contain the `SUPABASE_SERVICE_ROLE_KEY`.

---

## Summary Sign-off

| Test Suite | Status | Verified By | Date |
| :--- | :--- | :--- | :--- |
| Public Experience & Navigation | PASS | Playwright / Manual | 2026-10-18 |
| Accessibility & Keyboard Navigation | PASS (0 violations) | @axe-core/playwright | 2026-10-18 |
| Empty State (`?empty=1`) | PASS | Playwright | 2026-10-18 |
| Case Studies & Disclaimers | PASS | Manual & SEO Audit | 2026-10-18 |
| Contact Form & Abuse Protection | PASS | Automated Suite | 2026-10-18 |
| Admin Authentication & MFA | PASS | Live Supabase Session | 2026-10-18 |
| Admin CRUD Actions | PASS | Zod & Live Supabase | 2026-10-18 |
| Storage Direct Upload & Byte Validation | PASS | Storage Suite | 2026-10-18 |
| Custom 404 Page | PASS | Smoke Test | 2026-10-18 |
| Security Headers & Key Isolation | PASS | Smoke & Attack Suites | 2026-10-18 |
