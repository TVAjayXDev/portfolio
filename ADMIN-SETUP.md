# Administrator Setup & Security Guide

This document explains the initialization, authentication, and emergency recovery procedure for the administrative console of the T V Ajay portfolio.

---

### 0. First Admin Setup (Supabase Dashboard & SQL)

Before your first login, create your administrator user in Supabase Authentication and register their UID in `public.admin_users`:

#### Step 1: Create the User in Supabase Dashboard
1. Go to your **[Supabase Dashboard](https://supabase.com/dashboard)** &rarr; select project `chjoxqfxahmonjoobxhl`.
2. Navigate to **Authentication** &rarr; **Users**.
3. Click **Add user** &rarr; **Create user**.
4. Enter your admin email (`tvajay0@gmail.com`) and a strong master password.
5. Toggle **Auto Confirm User?** to **ON** (so email verification is immediately satisfied).
6. Click **Create user**.

#### Step 2: Grant Admin Rights in `public.admin_users`
1. Navigate to the **SQL Editor** in the Supabase Dashboard.
2. Paste and run the following SQL command:

```sql
-- Automatically link the newly created auth user into admin_users
insert into public.admin_users (user_id)
select id from auth.users
where email = 'tvajay0@gmail.com'
on conflict (user_id) do nothing;

-- Verify admin registration:
select u.id, u.email, a.created_at as admin_registered_at
from auth.users u
join public.admin_users a on a.user_id = u.id
where u.email = 'tvajay0@gmail.com';
```

Once the query returns 1 row with `admin_registered_at`, your admin membership is active. Proceed to **Step 1** below to complete MFA enrolment.

---

### 1. First-Time Login & Mandatory MFA Enrolment

The portfolio strictly enforces **AAL2 (Authenticator Assurance Level 2)** for all administrative operations. Password-only logins cannot access or modify any administrative data.

1. **Sign In with Password:**
   - Navigate to `/admin/login`.
   - Enter your administrator email (`tvajay0@gmail.com`) and your password.
   - Click **Sign In to Console**.

2. **Mandatory MFA Enrolment:**
   - Because no TOTP factor is enrolled yet, you are immediately redirected to `/admin/mfa/enroll`.
   - You cannot navigate to any other `/admin/*` section until enrolment is completed.

3. **Pair Your Authenticator App:**
   - Open **Google Authenticator**, **Authy**, or **1Password** on your mobile device.
   - Scan the QR code displayed on the screen.
   - **CRITICAL - Save the Manual Secret Key:**
     - Copy the alphanumeric **Secret Key** displayed beneath the QR code and store it in your primary password manager.
     - **Important:** Supabase TOTP MFA does not issue backup/recovery codes. Saving this manual secret key is your backup to regenerate TOTP codes on a new device.

4. **Verify & Activate:**
   - Enter the 6-digit code from your authenticator app into the confirmation input.
   - Click **Verify & Activate MFA**.
   - Your session is elevated to **AAL2**, and you will be redirected to the Admin Overview Dashboard.

---

### 2. Daily Sign-In Workflow

1. Navigate to `/admin/login` and submit your email and password.
2. The login route recognizes your enrolled MFA factor and redirects you to `/admin/mfa/challenge`.
3. Enter the current 6-digit code from your authenticator application.
4. Upon successful TOTP verification, your session receives an `aal2` claim in its cryptographic JWT and grants access to `/admin`.

---

### 3. Emergency Recovery Procedure (Lost Device)

If you lose access to your mobile authenticator app and did not back up the manual secret key:

1. Log into your **[Supabase Project Dashboard](https://supabase.com/dashboard)** as the project owner.
2. In the left navigation, click **Authentication** &rarr; **Users**.
3. Select your admin user (`tvajay0@gmail.com`).
4. Locate the **Multi-Factor Authentication (MFA)** section or user factors tab.
5. Click **Delete Factor** (or *Remove Factor*) to delete the enrolled TOTP device.
6. Return to `/admin/login` on the portfolio:
   - Sign in with your email and password.
   - The system detects 0 enrolled factors and immediately directs you to `/admin/mfa/enroll` to pair a new device.

---

### 4. Session & Inactivity Guardrails

- **30-Minute Inactivity Timeout:** If you leave your admin console idle for 30 minutes, your server-side session is automatically revoked (`supabase.auth.signOut()`) and your browser is redirected back to `/admin/login?reason=timeout`.
- **Rate Limiting:** Failed password attempts trigger progressive temporary locks (15s, 30s, 60s, up to 15m for abusive IP addresses; capped at 60s for email-only locks).
