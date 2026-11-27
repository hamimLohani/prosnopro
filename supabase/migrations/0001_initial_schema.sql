-- ProsnoPro Initial Schema (v4 Zero-Cost Edition)
-- Run in Supabase SQL Editor or via `supabase db push`.

-- 1. Extensions
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- pg_cron is available on Supabase Free; wrapped safely in case local Postgres lacks it.
do $$
begin
  create extension if not exists pg_cron with schema extensions;
exception
  when others then
    raise notice 'pg_cron not enabled automatically (%). Enable Database > Extensions > pg_cron in Supabase if needed.', sqlerrm;
end $$;

-- 2. Shared helpers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 3. Core Tables

-- Profiles (1:1 with auth.users; Supabase Auth owns email, password_hash, email_verified)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('teacher', 'student')),
  name text not null check (char_length(trim(name)) between 1 and 120),
  roll text check (roll is null or char_length(trim(roll)) <= 60),
  institution text check (institution is null or char_length(trim(institution)) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role then
    raise exception 'Profile role cannot be changed once assigned.';
  end if;
  return new;
end;
$$;

create trigger profiles_lock_role
before update on public.profiles
for each row execute function public.prevent_profile_role_change();

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Teacher profiles (ai_key_encrypted is revoked from anon/authenticated SELECT below)
create table if not exists public.teacher_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  teacher_code text not null check (teacher_code ~ '^[A-Za-z0-9]{4,12}$'),
  ai_provider text check (ai_provider is null or ai_provider in ('gemini', 'groq', 'openai', 'anthropic')),
  ai_key_encrypted text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists teacher_profiles_code_lower_uidx
  on public.teacher_profiles (lower(teacher_code));

create trigger teacher_profiles_set_updated_at
before update on public.teacher_profiles
for each row execute function public.set_updated_at();

-- Exams
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 200),
  subject text not null default '',
  medium text not null default 'bn' check (medium in ('bn', 'en')),
  question_count integer not null default 0 check (question_count >= 0),
  duration_minutes integer not null check (duration_minutes between 1 and 600),
  options_per_question integer not null default 4 check (options_per_question between 2 and 6),
  default_marks numeric(6,2) not null default 1 check (default_marks > 0),
  negative_marking boolean not null default false,
  negative_value numeric(6,2) not null default 0 check (negative_value >= 0),
  shuffle_questions boolean not null default false,
  shuffle_options boolean not null default false,
  schedule_enabled boolean not null default false,
  opens_at timestamptz,
  closes_at timestamptz,
  force_close_active boolean not null default false,
  instructions text not null default '',
  result_release text not null default 'after_submit'
    check (result_release in ('after_submit', 'after_close', 'manual', 'teacher_only')),
  results_released_at timestamptz,
  show_answers boolean not null default true,
  practice_sharing boolean not null default false,
  code text not null check (code ~ '^[A-Za-z0-9]{3,16}$'),
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not schedule_enabled or (opens_at is not null and closes_at is not null and closes_at > opens_at))
);

create unique index if not exists exams_teacher_code_lower_uidx
  on public.exams (teacher_id, lower(code));

create index if not exists exams_teacher_status_idx
  on public.exams (teacher_id, status, created_at desc);

create trigger exams_set_updated_at
before update on public.exams
for each row execute function public.set_updated_at();

-- Question bank
create table if not exists public.question_bank (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  text text not null check (char_length(trim(text)) >= 1),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),
  correct_index integer not null check (correct_index >= 0),
  explanation text,
  subject text not null default '',
  class text not null default '',
  tags text[] not null default '{}',
  medium text not null default 'bn' check (medium in ('bn', 'en')),
  source text not null default 'manual' check (source in ('manual', 'ai', 'pdf')),
  visibility text not null default 'private' check (visibility in ('private', 'shared')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (correct_index < jsonb_array_length(options))
);

create index if not exists question_bank_teacher_idx
  on public.question_bank (teacher_id, created_at desc);

create index if not exists question_bank_shared_filter_idx
  on public.question_bank (visibility, medium, subject, class)
  where visibility = 'shared';

create index if not exists question_bank_text_trgm_idx
  on public.question_bank using gin (text extensions.gin_trgm_ops);

create index if not exists question_bank_fts_idx
  on public.question_bank using gin (
    to_tsvector('simple', coalesce(text, '') || ' ' || coalesce(subject, '') || ' ' || coalesce(class, ''))
  );

create trigger question_bank_set_updated_at
before update on public.question_bank
for each row execute function public.set_updated_at();

-- Exam questions (snapshotted on creation/addition; bank_id kept only to hide active items from practice search)
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  position integer not null check (position >= 0),
  text text not null check (char_length(trim(text)) >= 1),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),
  correct_index integer not null check (correct_index >= 0),
  explanation text,
  marks numeric(6,2) not null default 1 check (marks > 0),
  bank_id uuid references public.question_bank (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (exam_id, position),
  check (correct_index < jsonb_array_length(options))
);

create index if not exists questions_exam_pos_idx
  on public.questions (exam_id, position);

create index if not exists questions_bank_id_idx
  on public.questions (bank_id)
  where bank_id is not null;

-- Attempts (one per student per exam; canonical option indices stored in draft_answers / answers)
create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  student_name text not null,
  student_roll text,
  started_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  submitted_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'auto_submitted')),
  question_order jsonb not null,
  option_orders jsonb not null default '{}'::jsonb,
  draft_answers jsonb not null default '{}'::jsonb,
  answers jsonb,
  client_seq integer not null default 0,
  score numeric(8,2),
  total_marks numeric(8,2),
  active_session_id text not null,
  violation_counts jsonb not null default '{"tab_switches":0,"blurs":0,"fullscreen_exits":0,"copy_attempts":0,"away_seconds":0}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_id, student_id)
);

create index if not exists attempts_student_idx
  on public.attempts (student_id, started_at desc);

create index if not exists attempts_expired_in_progress_idx
  on public.attempts (deadline_at)
  where status = 'in_progress';

create trigger attempts_set_updated_at
before update on public.attempts
for each row execute function public.set_updated_at();

-- Entry events
create table if not exists public.entry_events (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null check (event_type in ('joined', 'resumed', 'second_device', 'new_tab')),
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists entry_events_exam_created_idx
  on public.entry_events (exam_id, created_at desc);

-- Code entry rate limiting (server-only)
create table if not exists public.code_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  ip text not null,
  failed_count integer not null default 0,
  blocked_until timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, ip)
);

create trigger code_attempts_set_updated_at
before update on public.code_attempts
for each row execute function public.set_updated_at();

-- 4. Row Level Security

alter table public.profiles enable row level security;
alter table public.teacher_profiles enable row level security;
alter table public.exams enable row level security;
alter table public.question_bank enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.entry_events enable row level security;
alter table public.code_attempts enable row level security;

-- Restrict encrypted AI key column from ever being read directly by client roles
revoke select (ai_key_encrypted) on public.teacher_profiles from anon, authenticated;

-- profiles policies
create policy "Users can view own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Teachers can view profiles of students in their exams"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.attempts a
      join public.exams e on e.id = a.exam_id
      where a.student_id = profiles.id
        and e.teacher_id = auth.uid()
    )
  );

create policy "Users can update own profile metadata"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- teacher_profiles policies
create policy "Teachers can view own teacher profile"
  on public.teacher_profiles for select
  using (user_id = auth.uid());

create policy "Teachers can update own teacher code or provider"
  on public.teacher_profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- exams policies (teachers own their exams; student joins go via server routes/RPC)
create policy "Teachers manage own exams"
  on public.exams for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- question_bank policies (teachers only; student practice search uses server/RPC to strip/hide answers)
create policy "Teachers view own and shared question bank"
  on public.question_bank for select
  using (
    public.current_user_role() = 'teacher'
    and (teacher_id = auth.uid() or visibility = 'shared')
  );

create policy "Teachers insert own question bank items"
  on public.question_bank for insert
  with check (
    public.current_user_role() = 'teacher'
    and teacher_id = auth.uid()
  );

create policy "Teachers update own question bank items"
  on public.question_bank for update
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create policy "Teachers delete own question bank items"
  on public.question_bank for delete
  using (teacher_id = auth.uid());

-- questions policies (teachers only; prevents leaking correct_index/explanation during exam)
create policy "Teachers manage questions of own exams"
  on public.questions for all
  using (
    exists (
      select 1 from public.exams e
      where e.id = questions.exam_id and e.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.exams e
      where e.id = questions.exam_id and e.teacher_id = auth.uid()
    )
  );

-- attempts policies (read access for owner student / exam teacher; mutations go through server routes/RPCs)
create policy "Students can view own attempts"
  on public.attempts for select
  using (student_id = auth.uid());

create policy "Teachers can view attempts for own exams"
  on public.attempts for select
  using (
    exists (
      select 1 from public.exams e
      where e.id = attempts.exam_id and e.teacher_id = auth.uid()
    )
  );

-- entry_events policies
create policy "Teachers can view entry events for own exams"
  on public.entry_events for select
  using (
    exists (
      select 1 from public.exams e
      where e.id = entry_events.exam_id and e.teacher_id = auth.uid()
    )
  );

-- code_attempts intentionally has NO client policies (service_role / security definer only)

-- 5. RPC Functions (Safe Onboarding, Live Availability Check, Auto-Submit, Log Cleanup)

create or replace function public.check_teacher_code_available(p_code text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  normalized text := upper(trim(coalesce(p_code, '')));
begin
  if normalized !~ '^[A-Za-z0-9]{4,12}$' then
    return false;
  end if;

  return not exists (
    select 1 from public.teacher_profiles
    where lower(teacher_code) = lower(normalized)
      and user_id is distinct from auth.uid()
  );
end;
$$;

grant execute on function public.check_teacher_code_available(text) to anon, authenticated;

create or replace function public.complete_onboarding(
  p_role text,
  p_name text,
  p_teacher_code text default null,
  p_roll text default null,
  p_institution text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_clean_name text := trim(coalesce(p_name, ''));
  v_clean_code text := upper(trim(coalesce(p_teacher_code, '')));
  v_clean_roll text := nullif(trim(coalesce(p_roll, '')), '');
  v_clean_inst text := nullif(trim(coalesce(p_institution, '')), '');
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'Onboarding already completed';
  end if;

  if p_role not in ('teacher', 'student') then
    raise exception 'Invalid role';
  end if;

  if char_length(v_clean_name) < 1 or char_length(v_clean_name) > 120 then
    raise exception 'Name must be between 1 and 120 characters';
  end if;

  if p_role = 'teacher' then
    if v_clean_code !~ '^[A-Za-z0-9]{4,12}$' then
      raise exception 'Teacher Code must be 4-12 letters or digits';
    end if;

    if exists (select 1 from public.teacher_profiles where lower(teacher_code) = lower(v_clean_code)) then
      raise exception 'Teacher Code is already taken';
    end if;

    insert into public.profiles (id, role, name)
    values (v_uid, 'teacher', v_clean_name);

    insert into public.teacher_profiles (user_id, teacher_code)
    values (v_uid, v_clean_code);
  else
    insert into public.profiles (id, role, name, roll, institution)
    values (v_uid, 'student', v_clean_name, v_clean_roll, v_clean_inst);
  end if;

  return jsonb_build_object(
    'id', v_uid,
    'role', p_role,
    'name', v_clean_name,
    'teacher_code', case when p_role = 'teacher' then v_clean_code else null end
  );
end;
$$;

grant execute on function public.complete_onboarding(text, text, text, text, text) to authenticated;

create or replace function public.update_teacher_code(p_new_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_clean_code text := upper(trim(coalesce(p_new_code, '')));
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if public.current_user_role() <> 'teacher' then
    raise exception 'Only teachers can update Teacher Code';
  end if;

  if v_clean_code !~ '^[A-Za-z0-9]{4,12}$' then
    raise exception 'Teacher Code must be 4-12 letters or digits';
  end if;

  if exists (
    select 1 from public.teacher_profiles
    where lower(teacher_code) = lower(v_clean_code)
      and user_id <> v_uid
  ) then
    raise exception 'Teacher Code is already taken';
  end if;

  update public.teacher_profiles
  set teacher_code = v_clean_code
  where user_id = v_uid;

  return v_clean_code;
end;
$$;

grant execute on function public.update_teacher_code(text) to authenticated;

-- Auto-submit expired attempts (called by pg_cron and lazily from server reads)
create or replace function public.finalize_expired_attempts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_attempt record;
  v_exam record;
  v_q record;
  v_ans_text text;
  v_ans_idx integer;
  v_score numeric(8,2);
  v_total numeric(8,2);
begin
  for v_attempt in
    select a.*
    from public.attempts a
    where a.status = 'in_progress'
      and a.deadline_at < now() - interval '15 seconds'
    for update skip locked
  loop
    select * into v_exam from public.exams where id = v_attempt.exam_id;
    v_score := 0;
    v_total := 0;

    for v_q in
      select id, correct_index, marks
      from public.questions
      where exam_id = v_attempt.exam_id
    loop
      v_total := v_total + v_q.marks;
      v_ans_text := v_attempt.draft_answers ->> (v_q.id::text);
      if v_ans_text is not null and v_ans_text ~ '^[0-9]+$' then
        v_ans_idx := v_ans_text::integer;
        if v_ans_idx = v_q.correct_index then
          v_score := v_score + v_q.marks;
        elsif v_exam.negative_marking then
          v_score := v_score - v_exam.negative_value;
        end if;
      end if;
    end loop;

    update public.attempts
    set
      answers = v_attempt.draft_answers,
      score = v_score,
      total_marks = v_total,
      status = 'auto_submitted',
      submitted_at = least(now(), v_attempt.deadline_at)
    where id = v_attempt.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- Retention cleanup to stay safely inside Supabase Free's 500 MB database limit
create or replace function public.cleanup_old_logs()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.code_attempts
  where updated_at < now() - interval '7 days';

  delete from public.entry_events
  where created_at < now() - interval '90 days';
end;
$$;

-- Schedule pg_cron jobs if pg_cron extension is available
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('prosnopro-auto-submit')
    where exists (select 1 from cron.job where jobname = 'prosnopro-auto-submit');

    perform cron.schedule(
      'prosnopro-auto-submit',
      '* * * * *',
      'select public.finalize_expired_attempts();'
    );

    perform cron.unschedule('prosnopro-cleanup-logs')
    where exists (select 1 from cron.job where jobname = 'prosnopro-cleanup-logs');

    perform cron.schedule(
      'prosnopro-cleanup-logs',
      '15 3 * * *',
      'select public.cleanup_old_logs();'
    );
  end if;
exception
  when others then
    raise notice 'Could not register pg_cron schedules (%). Configure manually in Supabase Dashboard if needed.', sqlerrm;
end $$;
