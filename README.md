# ProsnoPro (v4 Zero-Cost Edition)

Timed Bangla & English online MCQ exam platform built to run at **\$0/month** on **Next.js + Supabase Free + Vercel Hobby**.

## Step 1 Included

- **Supabase SQL Schema & RLS** ([0001_initial_schema.sql](supabase/migrations/0001_initial_schema.sql)) covering `profiles`, `teacher_profiles`, `exams`, `questions`, `question_bank`, `attempts`, `entry_events`, `code_attempts`, column-level protection on `ai_key_encrypted`, `pg_trgm` + `'simple'` FTS indexes, and `pg_cron` auto-submit/cleanup functions.
- **Auth & Onboarding:** Google OAuth (primary \$0 auth), Email/Password signup/login/verify/reset, live Teacher Code availability check (`/api/teacher-code/check`), and role-locked onboarding (`/onboarding`).
- **Keep-Alive Setup:** `/api/health` endpoint + daily Vercel Hobby cron (`vercel.json`) + GitHub Actions workflow (`.github/workflows/keep-alive.yml`) so Supabase Free never pauses after 7 days of inactivity.
- **Bangla Print-PDF & `pdf.js` Spike (`/tools/bangla-spike`):** Verifies native browser Bangla conjunct rendering (`@media print`) and browser-only `pdfjs-dist` parsing with automatic legacy Bijoy/scanned detection.

## \$0 Setup Guide

1. **Create a free Supabase project** at supabase.com.
2. Open **SQL Editor** and run in order:
   - [`supabase/migrations/0001_initial_schema.sql`](supabase/migrations/0001_initial_schema.sql)
   - [`supabase/migrations/0002_step2_exam_rpc.sql`](supabase/migrations/0002_step2_exam_rpc.sql)
   - [`supabase/migrations/0003_teacher_ai_settings.sql`](supabase/migrations/0003_teacher_ai_settings.sql)
   - [`supabase/migrations/0004_step5_student_tools.sql`](supabase/migrations/0004_step5_student_tools.sql)
3. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. For Teacher BYOK AI keys (encrypted at rest on server), also set `SUPABASE_SERVICE_ROLE_KEY` and `AI_ENCRYPTION_KEY` (`openssl rand -hex 32`).
4. **Enable Google OAuth (recommended \$0 auth):**
   - In Google Cloud Console, create OAuth credentials and add Supabase's callback URL.
   - In Supabase Dashboard → **Authentication → Providers → Google**, paste Client ID & Secret.
   - In **Authentication → URL Configuration**, add `http://localhost:3000/auth/callback` and your production `https://<your-app>.vercel.app/auth/callback`.
5. *(Optional)* For Email + Password signup without buying a domain, configure **Authentication → SMTP Settings** with a Gmail App Password (`smtp.gmail.com`, port `465` or `587`). Once you have a custom domain, switch to Brevo Free or Resend Free.
6. Run locally:
   ```bash
   npm run dev
   ```
7. **Deploy free on Vercel Hobby:** Push to GitHub and import into Vercel with the same environment variables (`vercel.json` runs `/api/health` once daily).
