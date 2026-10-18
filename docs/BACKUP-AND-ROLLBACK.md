# Backup, Rollback & Disaster Recovery Protocol

This document details operational protocols for safeguarding your data on the Supabase free tier, performing instant application rollbacks via Vercel, and maintaining forward-only database migrations.

---

## 1. Content & Database Backup on Supabase Free Tier

Because Supabase free-tier projects do not include automated daily backups or Point-in-Time Recovery (PITR), maintaining periodic snapshots of your database and storage assets is an essential operational practice.

### 1.1 Recommended Backup Cadence
- **Before Major Content Updates:** Before bulk editing projects, restructuring sections, or executing new SQL schema migrations.
- **Monthly Cadence:** A routine export on the 1st of every month.

---

### 1.2 Export Method A: PostgreSQL `pg_dump` (Recommended for Full Data Dump)

Using standard PostgreSQL command-line utilities, you can extract a complete, timestamped SQL dump containing all table structures, constraints, and rows:

1. Obtain your Supabase database connection string from:
   **Supabase Dashboard &rarr; Project Settings &rarr; Database &rarr; Connection string (URI / Session Pooler)**.
2. Run `pg_dump` from your terminal:

```bash
# Dump all table data with insert statements
pg_dump \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --data-only \
  "postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" \
  > "backup_portfolio_data_$(date +%Y%m%d).sql"
```

To restore from this SQL dump if ever needed:
```bash
psql "postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" \
  < "backup_portfolio_data_20261018.sql"
```

---

### 1.3 Export Method B: Supabase Studio Table Export (Quick CSV)

For quick manual backups of individual tables:
1. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **Table Editor** in the left navigation.
3. For each content table (`site_settings`, `sections`, `projects`, `skills`, `education`, `experience`, `certifications`, `posts`, `messages`):
   - Select the table.
   - Click the **Export** button in the top-right toolbar.
   - Choose **Export table as CSV**.
4. Store the downloaded CSV files in a secure, encrypted folder (e.g., your personal password manager or private cloud backup).

---

### 1.4 Export Method C: Storage Bucket Assets Backup

To back up uploaded media assets (PDF resumes, certificate thumbnails, project screenshots):
1. In the Supabase Dashboard, navigate to **Storage &rarr; Buckets**.
2. For each bucket (`resumes`, `certificates`, `project-images`, `blog`):
   - View bucket contents.
   - Download copies of critical uploaded PDFs and images to your local drive.

---

## 2. Vercel Instant Rollback

Every deployment created on Vercel is immutable and retained indefinitely. If an application bug, visual regression, or breaking change is deployed to production:

### 2.1 Instant Rollback Procedure (< 15 Seconds)
1. Open your project in the [Vercel Dashboard](https://vercel.com/).
2. Click on the **Deployments** tab.
3. Locate the most recent healthy deployment prior to the broken release.
4. Click the three dots (`...`) icon on the right side of that deployment card.
5. Select **Instant Rollback** (or **Promote to Production**).
6. Confirm the prompt.

**Result:** Vercel instantly routes edge traffic to the previous build artifact with **zero downtime** and **no rebuild delay**.

---

## 3. Forward-Only Database Migrations

This platform follows a strict **forward-only database migration philosophy**.

### 3.1 Core Principles
1. **Never edit an existing migration file** that has already been applied to any live database. Modifying past migration files breaks idempotency and introduces schema drift across development and production environments.
2. **Reversals are new migrations:** If a column, table, or index must be modified, renamed, or dropped, create a new timestamped migration file that performs the reversal forward:
   - Example filename: `supabase/migrations/20261019000001_revert_feature_x.sql`
   - Content:
     ```sql
     -- Revert feature X
     ALTER TABLE public.example DROP COLUMN IF EXISTS unwanted_column;
     ```
3. **Always update `setup_all.sql`:** Whenever a new forward migration is created, mirror the final desired schema state in [`supabase/setup_all.sql`](file:///supabase/setup_all.sql) so that fresh environments can always be spun up with a single SQL script.
4. **Idempotence Required:** Always use `IF EXISTS`, `IF NOT EXISTS`, and `ON CONFLICT DO NOTHING` statements in migrations to ensure they can be re-run safely without crashing.

---

## 4. Disaster Recovery Scenarios

| Scenario | Recovery Action | Target RTO (Recovery Time) |
| :--- | :--- | :--- |
| Broken frontend deployment | Trigger Vercel **Instant Rollback** to previous deployment | < 1 minute |
| Accidental content deletion in admin | Restore affected table rows from recent `pg_dump` or CSV export | < 10 minutes |
| Compromised `service_role` key | Rotate API key in Supabase Dashboard &rarr; update `SUPABASE_SERVICE_ROLE_KEY` in Vercel | < 5 minutes |
| Corrupted database schema | Re-run [`supabase/setup_all.sql`](file:///supabase/setup_all.sql) on a fresh Supabase project and re-import data | < 15 minutes |
