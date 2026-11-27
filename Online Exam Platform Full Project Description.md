# Online Exam Platform: ProsnoPro
## Full Project Description

Project specification, version 4 (Zero-Cost / Free-Tier Edition)

## 1. Overview

A web platform where **teachers** create timed multiple-choice exams in Bangla or English and **students**, who have their own accounts, join with a Teacher Code and an Exam Code. All exam records live in the teacher's account. Students see their own results and can practice with past questions.

**Goals:** simple for teachers, fair for students, **\$0/month to run initially** on free tiers, and usable on weak mobile networks.

**Out of scope for now:** camera proctoring, non-MCQ question types, question diagram/image uploads, payments (required before leaving Vercel Hobby's non-commercial tier), multi-teacher organizations, and paid custom-domain email infrastructure (optional later upgrade).

## 2. Roles and accounts

**Auth strategy (zero-cost):**

- **Primary:** "Continue with Google" (Supabase OAuth) — free, unlimited, instant for mobile users, and requires no verification emails or password resets. After first Google sign-in, the user completes a short onboarding step to select their role and profile details.
- **Secondary (optional email + password):** Supported via Supabase Auth with Custom SMTP (since Supabase's built-in mailer is limited to 2 emails/hour for team members only). For strict \$0 without buying a domain, use a dedicated Gmail SMTP App Password during early pilots; once a custom domain is connected, switch to Brevo Free (300/day) or Resend Free (100/day).
- **Role security:** Account `role` is stored server-side (`app_metadata` and a RLS-protected `profiles` column) so users cannot escalate their own role from the browser.

**Teacher**

- Signs up with name, email (Google OAuth or email/password), and a **Teacher Code that they choose** (unique, case-insensitive, 4-12 letters/digits, availability checked live)
- Changing the Teacher Code later warns that old join instructions/links will stop working
- Verifies their email (automatic for Google OAuth)
- Optionally adds their own **AI API key** in settings (free-tier BYOK providers supported)

**Student**

- Signs up with name, email (Google OAuth or email/password), and optional roll/ID and institution
- Verifies their email (automatic for Google OAuth), and can reset a forgotten password if using email/password
- The account `name` and `roll` are locked for exams and **snapshotted onto each attempt at start**, so students can't retype a different name per exam or alter historical records via later profile edits

## 3. Teacher flow

1. Log in and open the dashboard (my exams, question bank, settings)
2. **Create exam** (settings in section 5)
3. **Set questions** (section 6)
4. **Review**: preview the exam as the student sees it, with warnings for missing answers, invalid `correct_index`, or wrong option counts
5. **Publish**: generate/confirm the Exam Code (unique per teacher, case-insensitive)
6. **Monitor**: live/refreshable list of students who entered, with name, roll, joined time, status, and re-entry or second-device alerts
7. **Results**: scores, per-student detail, per-question analytics, tab-switch counts and away duration
8. **Export**: results and exam questions (all generated client-side in the browser)
9. **Manage lifecycle**: close the exam manually, duplicate it, fix answer-key typos with an explicit **Save & re-grade attempts** action, or delete it. Structural fields (duration, option count, shuffle flags, adding/deleting questions) lock once the first student starts an attempt

## 4. Student flow

1. Log in and open the dashboard (join exam, my results, practice search)
2. **Join**: enter Teacher Code + Exam Code (normalized case-insensitively, rate-limited, one generic error message)
3. **Instructions page**: duration, number of questions, marking rules, negative marking, protection notice, "answers submit at the end", and a tick to acknowledge
4. **Exam**: all questions on one lightweight page, one server-synced countdown, question navigator, answers changeable until submission, with a subtle local/synced status indicator
5. **Submit** with a confirmation step, or auto-submit when time ends
6. **My results**: attempt history, with answers and explanations when the release setting allows
7. **Practice search**: search past questions (section 9)

## 5. Exam settings

| Setting | Detail |
| --- | --- |
| Medium | Bangla or English |
| Name, subject | Text |
| Number of questions | Number |
| Total time | Minutes for the whole exam, not per question |
| Options per question | Number |
| Default marks | 1 per question, editable per question |
| Negative marking | On/off, with a deduction per wrong answer. Unanswered gets no penalty |
| Shuffle | Questions, and optionally options, shuffled per student and saved on the attempt |
| Schedule (optional) | **Off:** open from publish until the teacher closes it, each student gets the full duration from their start. **On:** an opens-at and closes-at window, where a late starter gets `min(full duration, time left in the window)` |
| Manual close behavior | Closing manually blocks new joins immediately; active `in_progress` attempts finish until their remaining `deadline_at` (with an optional teacher toggle to force-close and auto-submit immediately) |
| Instructions | Custom text shown before the exam |
| Result release | After submit / after the exam closes / manual / teacher only |
| Show answers | Whether correct answers and explanations appear in student results |
| Practice sharing | Allow this exam's questions into student practice search after it closes (off by default) |
| Math notation | Optional lightweight KaTeX inline math (`$...$`) rendered in question text, options, and explanations |
| Protection level | **Standard** (see section 8) |

## 6. Question sources

Four sources only:

1. **Manual**: question, options, correct answer, optional explanation, marks
2. **Question bank**: search and filter your saved questions (plus shared questions), then **copy a snapshot** into the exam (keeping `bank_id` only as a reference link so later bank edits never mutate live or historical exams)
3. **With AI**: the teacher gives class, subject, and extra notes. The exam's medium, option count, and question count are filled in automatically
4. **PDF import**: parsed client-side first to stay free and avoid Vercel timeouts and Supabase Storage limits:
   - **Text PDFs** are extracted in the browser (`pdf.js`). If extracted text lacks valid Bengali Unicode (`U+0980–U+09FF`) due to legacy ANSI/Bijoy encoding (e.g., SutonnyMJ), those pages are automatically routed to the scanned/vision path
   - **Scanned / Bijoy PDFs** are rendered in the browser to compressed page images and sent in small batches to a vision-capable AI model

**AI and PDF rules:**

- Calls run on the server with the teacher's own API key (AES-256-GCM encrypted at rest, never sent back to the browser). Free-tier providers requiring no credit card — **Google AI Studio (Gemini Flash / Flash-Lite)** and **Groq** — are supported out of the box
- Output must be strict JSON validated on the server. Results land in the editor as drafts, and the teacher must review them and confirm correct answers before saving
- **Zero long-term PDF storage:** Because extraction and page rendering happen in the browser and batches are discarded immediately after processing, uploaded PDFs use **0 bytes** of Supabase Storage (with strict page/size limits enforced)
- Teachers with no API key can still use manual entry, the question bank, and structured text extraction from Unicode text PDFs

Every question can be saved to the **question bank** with subject, class, tags, medium, and a private/shared flag.

## 7. Exam rules and integrity

- **One attempt per student per exam**, enforced by a database unique constraint on `(exam_id, student_id)`
- **Server-side deadline:** `deadline_at` is stored in UTC (`timestamptz`) at start. The browser timer is calculated using server clock offset so wrong device clocks don't skew the countdown
- **Submit & offline-resilient backup model:** Every tap is saved immediately to `localStorage` (`0` network delay). Every 30-60 seconds **only when dirty** (plus `navigator.sendBeacon` / `fetch(..., { keepalive: true })` on `pagehide`), `draft_answers`, `client_seq`, and `violation_counts` are batched to the server. This preserves weak-network usability, stretches free-tier egress, and enables resume or auto-submit
- **Canonical answer storage:** `draft_answers` and `answers` always record the **unshuffled canonical option index** (`0..N-1`), never the shuffled display position, so grading and per-option analytics stay accurate
- **Server auto-submit (zero paid workers):** Combines (1) client auto-submit at `t=0` with a ~15-30s server grace window for slow networks, (2) **lazy finalization on read** whenever results, monitor, or resume are accessed past `deadline_at`, and (3) a **Supabase `pg_cron` sweep** every 1-2 minutes for unattended expired attempts
- **Drop-and-resume:** the same account returning continues the same attempt with the remaining time and the same shuffled order
- **Second device / multi-tab:** logging in or opening the exam elsewhere updates `active_session_id` and records a `second_device` event (distinguishing same-device multi-tab vs new IP/UA). Draft sync and submit reject stale `active_session_id` values (`409 Conflict`) and immediately lock the superseded tab
- **Server-only grading and answer protection:** Student question payloads are served through Next.js server routes/RPCs that omit `correct_index` and `explanation` completely until result release allows them
- **Code-entry rate limiting:** Enforced from initial launch per account and per IP in `code_attempts`, with exponential backoff delays after repeated failures

## 8. Protection level: Standard

- Text selection, copy, cut, right-click, drag, and print are disabled on the exam page, and the exam is hidden in print CSS
- Questions load only after the student presses Start
- A faint **watermark** of the student's name, roll (if present), and time covers the page, so a leaked screenshot or photo is traceable
- Logged and shown to the teacher (bundled into the periodic batch sync to avoid extra network calls): tab switches, window blur, total away time, fullscreen exit, and copy/print attempts. These are informational only, with no automatic penalty
- The instructions page tells students that these events are recorded, and the teacher UI notes that mobile notifications or incoming calls can trigger isolated `blur` events

Students can still take an OS screenshot or photograph the screen, since a website can't prevent either. Stricter levels (canvas rendering, required fullscreen, auto-submit on violations, Safe Exam Browser) are left for later.

## 9. Question search and practice

- **Teachers** search their own bank plus questions other teachers marked `shared`
- **Students** search only practice questions: those from **closed** exams whose teacher enabled `practice_sharing`, plus questions teachers published to the shared bank
- Questions of an open or scheduled exam are never searchable. A bank question referenced (`bank_id`) in any open or scheduled exam is hidden from student search until that exam closes
- Student practice search is disabled while the student has an attempt in progress
- Filters: subject, class, medium, keyword (indexed with Postgres `'simple'` full-text search + `pg_trgm` trigram indexes for Bangla/English mixed text)
- Practice UI hides the correct answer and explanation behind a "Reveal answer" toggle

## 10. Results and export

- **Result release** follows the teacher's setting, and students see results on their own dashboard (no automated result emails, saving email quota)
- **Teacher results view:** name, roll, score, percentage, time taken, submitted at, status (`submitted` / `auto_submitted`), tab-switch count and away duration
- **Analytics:** average, highest, lowest, percent correct per question, most-chosen wrong option (computed against canonical option indices)
- **Zero-cost client-side exports (code-split away from student exam routes):**
  - **PDF (Question paper, Answer key, Results):** Rendered via clean print-styled HTML (`@media print` -> Save as PDF) using `Noto Sans Bengali` / `Hind Siliguri` so Bangla conjuncts shape natively via the browser without headless Chrome or broken JS PDF libraries
  - **CSV / Excel:** Generated in the browser (CSV with UTF-8 BOM `\uFEFF` so Excel opens Bangla properly, or client-side `.xlsx`)
  - **Word:** Generated in the browser as `.docx` (UTF-8 Bangla safe)

## 11. Data model

- **profiles** (linked 1:1 to `auth.users.id`; Supabase Auth owns `email`, `password_hash`, `email_verified`, and `app_metadata.role`): id, role, name, roll, institution, created\_at
- **teacher\_profiles**: user\_id, teacher\_code (unique case-insensitive), ai\_provider, ai\_key\_encrypted
- **exams**: id, teacher\_id, name, subject, medium, duration\_minutes, options\_per\_question, default\_marks, negative\_marking, negative\_value, shuffle\_questions, shuffle\_options, schedule\_enabled, opens\_at, closes\_at, force\_close\_active, instructions, result\_release, show\_answers, practice\_sharing, code, status. Unique on `(teacher_id, lower(code))`
- **questions**: id, exam\_id, position, text, options, correct\_index, explanation, marks, bank\_id
- **question\_bank**: id, teacher\_id, text, options, correct\_index, explanation, subject, class, tags, medium, source (`manual` / `ai` / `pdf`), visibility (`private` / `shared`)
- **attempts**: id, exam\_id, student\_id, student\_name, student\_roll, started\_at, deadline\_at, submitted\_at, status, question\_order, option\_orders, draft\_answers, answers, client\_seq, score, total\_marks, active\_session\_id, violation\_counts. Unique on `(exam_id, student_id)`
- **entry\_events**: id, exam\_id, student\_id, event\_type (`joined` / `resumed` / `second_device` / `new_tab`), ip, user\_agent, created\_at
- **code\_attempts**: user\_id, ip, failed\_count, blocked\_until

Retention note: a scheduled `pg_cron` job prunes expired `code_attempts` and old raw `entry_events` to keep the database well inside Supabase Free's 500 MB cap.

## 12. Pages

- **Public:** landing, login (Google OAuth + email/password), teacher signup, student signup, onboarding (set role, Teacher Code, or Roll), verify email, reset password
- **Teacher:** dashboard, create/edit exam, question editor (manual / bank / AI / PDF), review, exam detail (code, monitor, results, analytics, export), print-PDF view (question paper / answer key / results), question bank, settings (teacher code, AI key)
- **Student:** dashboard, join exam, instructions, exam, submitted confirmation, my results, result detail, practice search
- **System:** `/api/health` (lightweight keep-alive query used once daily to prevent Supabase Free 7-day pausing)

## 13. Security and privacy

- HTTPS, hashed passwords, email verification / Google OAuth
- Row-level security plus server-route data stripping so each teacher sees only their own exams/results, and students never receive `correct_index` or `explanation` during an active attempt
- `role` cannot be self-modified by users
- AI keys encrypted at rest (AES-256-GCM with dedicated server key), used only on the server
- Student data (name, email, IP/device metadata) is recorded, so show a clear privacy notice. Students may be minors, so follow local rules on storing student data
- Automated retention cleanup (`pg_cron`) for old logs and periodic logical exports/backups

## 14. Technology (\$0 Free-Tier Stack)

- **Frontend and backend:** Next.js (App Router, React), strictly route-split so heavy teacher libraries (`pdf.js`, `docx`, `xlsx`) never ship to student exam pages
- **Hosting:** Vercel Hobby (\$0/month; free non-commercial tier; daily cron limit respected)
- **Database, Auth & Cron:** Supabase Free (\$0/month; 500 MB Postgres, 50,000 MAU, 5 GB egress, RLS, `pg_cron` for 1-2 min auto-submit sweeps & cleanup)
- **Keep-alive:** Daily Vercel Hobby cron (or free GitHub Actions schedule) hitting `/api/health` (`SELECT 1`) so Supabase Free never pauses after 7 days of inactivity
- **Auth & Email:** Google OAuth via Supabase (primary, \$0 unlimited) + optional Gmail SMTP App Password for zero-domain email/password verification (upgradable to Brevo/Resend free tier if a custom domain is added later)
- **Bangla text & math:** `Noto Sans Bengali` or `Hind Siliguri`, UTF-8 everywhere, optional lightweight KaTeX for math expressions
- **Exports:** Client-side `@media print` PDF, UTF-8 BOM CSV/Excel, and `docx` Word generation
- **AI and PDF:** Server-side provider adapter prioritizing credit-card-free tiers (Google Gemini AI Studio, Groq) paired with client-side `pdf.js` extraction and page rendering
- **Design:** Mobile-first, ultra-light exam pages for weak mobile networks and low egress

## 15. Build roadmap

1. **Foundation & Auth (\$0 setup):** Next.js + Supabase project, SQL schema + RLS, `/api/health` keep-alive, Google OAuth + optional SMTP email auth, onboarding (`role`, `teacher_code`, `roll`), and an early **Bangla print-PDF + `pdf.js` spike**
2. **Core exam & security baseline:** Exam settings, manual questions, publish, two-code join with `code_attempts` rate limiting, server-side answer stripping, instructions, lightweight exam page, submit, scoring with marks and negative marking
3. **Exam quality & auto-submit:** Canonical shuffle, optional schedule, `localStorage` + dirty-only batched sync, `active_session_id` takeover lock, `pg_cron` + lazy auto-submit, result release, Standard protection
4. **Teacher tools:** Entry monitor, results & analytics, client-side exports (print-PDF, UTF-8 BOM CSV/Excel, `.docx`), question bank (snapshot copy) and search
5. **Student tools:** My results, result detail, Bangla/English practice search with `bank_id` hiding
6. **AI & zero-storage PDF:** Encrypted BYOK settings, Gemini/Groq adapter, client-side `pdf.js` text/Bijoy-detection/image-batch import, validated JSON draft review
7. **Hardening:** Weak-network & mobile Safari/Android testing, retention `pg_cron` cleanup, load testing, privacy notice
