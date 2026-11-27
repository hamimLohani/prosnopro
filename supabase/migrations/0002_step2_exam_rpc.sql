-- ProsnoPro Step 2: Core Exam & Security Baseline RPCs and Triggers
-- Run after 0001_initial_schema.sql in Supabase SQL Editor.

-- 1. Keep exams.question_count in sync automatically
create or replace function public.sync_exam_question_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exam_id uuid := coalesce(new.exam_id, old.exam_id);
begin
  update public.exams
  set question_count = (
    select count(*)::integer from public.questions where exam_id = v_exam_id
  )
  where id = v_exam_id;
  return null;
end;
$$;

drop trigger if exists questions_sync_exam_count on public.questions;
create trigger questions_sync_exam_count
after insert or delete on public.questions
for each row execute function public.sync_exam_question_count();

-- 2. Lock structural edits once any attempt exists on an exam
create or replace function public.guard_exam_structural_edits()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from public.attempts where exam_id = old.id) then
    if new.duration_minutes is distinct from old.duration_minutes
      or new.options_per_question is distinct from old.options_per_question
      or new.shuffle_questions is distinct from old.shuffle_questions
      or new.shuffle_options is distinct from old.shuffle_options
      or new.negative_marking is distinct from old.negative_marking
      or new.negative_value is distinct from old.negative_value
    then
      raise exception 'Structural exam settings cannot be changed after students have started.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists exams_guard_structural_edits on public.exams;
create trigger exams_guard_structural_edits
before update on public.exams
for each row execute function public.guard_exam_structural_edits();

create or replace function public.guard_question_structural_edits()
returns trigger
language plpgsql
as $$
declare
  v_exam_id uuid := coalesce(new.exam_id, old.exam_id);
begin
  if exists (select 1 from public.attempts where exam_id = v_exam_id) then
    if tg_op = 'INSERT' or tg_op = 'DELETE' then
      raise exception 'Questions cannot be added or deleted after students have started.';
    end if;
    if tg_op = 'UPDATE' and (
      jsonb_array_length(new.options) is distinct from jsonb_array_length(old.options)
      or new.position is distinct from old.position
    ) then
      raise exception 'Question order and option count cannot change after students have started.';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists questions_guard_structural_edits on public.questions;
create trigger questions_guard_structural_edits
before insert or update or delete on public.questions
for each row execute function public.guard_question_structural_edits();

-- 3. Shared server-side grading helper (used by submit, auto-submit, force-close, and re-grade)
create or replace function public.score_exam_answers(
  p_exam_id uuid,
  p_negative_marking boolean,
  p_negative_value numeric,
  p_answers jsonb,
  out out_score numeric,
  out out_total numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_q record;
  v_ans_text text;
  v_ans_idx integer;
begin
  out_score := 0;
  out_total := 0;

  for v_q in
    select id, correct_index, marks
    from public.questions
    where exam_id = p_exam_id
  loop
    out_total := out_total + v_q.marks;
    v_ans_text := coalesce(p_answers, '{}'::jsonb) ->> (v_q.id::text);
    if v_ans_text is not null and v_ans_text ~ '^[0-9]+$' then
      v_ans_idx := v_ans_text::integer;
      if v_ans_idx = v_q.correct_index then
        out_score := out_score + v_q.marks;
      elsif p_negative_marking then
        out_score := out_score - p_negative_value;
      end if;
    end if;
  end loop;
end;
$$;

-- Update finalize_expired_attempts to reuse shared grading helper
create or replace function public.finalize_expired_attempts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_attempt record;
  v_exam public.exams%rowtype;
  v_graded record;
begin
  for v_attempt in
    select a.*
    from public.attempts a
    where a.status = 'in_progress'
      and a.deadline_at < now() - interval '15 seconds'
    for update skip locked
  loop
    select * into v_exam from public.exams where id = v_attempt.exam_id;
    select * into v_graded from public.score_exam_answers(
      v_attempt.exam_id,
      v_exam.negative_marking,
      v_exam.negative_value,
      v_attempt.draft_answers
    );

    update public.attempts
    set
      answers = v_attempt.draft_answers,
      score = v_graded.out_score,
      total_marks = v_graded.out_total,
      status = 'auto_submitted',
      submitted_at = least(now(), v_attempt.deadline_at)
    where id = v_attempt.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- 4. Teacher helper: close exam manually (optionally force-submitting active attempts)
create or replace function public.close_exam_manually(
  p_exam_id uuid,
  p_force_close_active boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_exam public.exams%rowtype;
  v_attempt record;
  v_graded record;
  v_closed_attempts integer := 0;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_exam from public.exams where id = p_exam_id and teacher_id = v_uid for update;
  if not found then
    raise exception 'Exam not found or access denied';
  end if;

  update public.exams
  set status = 'closed',
      force_close_active = p_force_close_active
  where id = p_exam_id;

  if p_force_close_active then
    for v_attempt in
      select * from public.attempts
      where exam_id = p_exam_id and status = 'in_progress'
      for update
    loop
      select * into v_graded from public.score_exam_answers(
        p_exam_id,
        v_exam.negative_marking,
        v_exam.negative_value,
        v_attempt.draft_answers
      );

      update public.attempts
      set
        answers = v_attempt.draft_answers,
        score = v_graded.out_score,
        total_marks = v_graded.out_total,
        status = 'auto_submitted',
        submitted_at = now()
      where id = v_attempt.id;

      v_closed_attempts := v_closed_attempts + 1;
    end loop;
  end if;

  return v_closed_attempts;
end;
$$;

grant execute on function public.close_exam_manually(uuid, boolean) to authenticated;

-- 5. Teacher helper: re-grade all submitted/auto-submitted attempts after an answer-key typo fix
create or replace function public.regrade_exam_attempts(p_exam_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_exam public.exams%rowtype;
  v_attempt record;
  v_graded record;
  v_updated integer := 0;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_exam from public.exams where id = p_exam_id and teacher_id = v_uid;
  if not found then
    raise exception 'Exam not found or access denied';
  end if;

  for v_attempt in
    select * from public.attempts
    where exam_id = p_exam_id
      and status in ('submitted', 'auto_submitted')
    for update
  loop
    select * into v_graded from public.score_exam_answers(
      p_exam_id,
      v_exam.negative_marking,
      v_exam.negative_value,
      coalesce(v_attempt.answers, v_attempt.draft_answers)
    );

    update public.attempts
    set score = v_graded.out_score, total_marks = v_graded.out_total
    where id = v_attempt.id;

    v_updated := v_updated + 1;
  end loop;

  return v_updated;
end;
$$;

grant execute on function public.regrade_exam_attempts(uuid) to authenticated;

-- 6. Teacher helper: duplicate an exam and all its questions into a new draft
create or replace function public.duplicate_exam(p_exam_id uuid, p_new_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_src public.exams%rowtype;
  v_new_id uuid;
  v_clean_code text := upper(trim(coalesce(p_new_code, '')));
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_src from public.exams where id = p_exam_id and teacher_id = v_uid;
  if not found then
    raise exception 'Exam not found';
  end if;

  if v_clean_code !~ '^[A-Za-z0-9]{3,16}$' then
    raise exception 'Exam code must be 3-16 letters or digits';
  end if;

  insert into public.exams (
    teacher_id, name, subject, medium, duration_minutes, options_per_question,
    default_marks, negative_marking, negative_value, shuffle_questions, shuffle_options,
    schedule_enabled, opens_at, closes_at, force_close_active, instructions,
    result_release, show_answers, practice_sharing, code, status
  )
  values (
    v_uid, v_src.name || ' (Copy)', v_src.subject, v_src.medium, v_src.duration_minutes,
    v_src.options_per_question, v_src.default_marks, v_src.negative_marking, v_src.negative_value,
    v_src.shuffle_questions, v_src.shuffle_options, false, null, null, v_src.force_close_active,
    v_src.instructions, v_src.result_release, v_src.show_answers, v_src.practice_sharing,
    v_clean_code, 'draft'
  )
  returning id into v_new_id;

  insert into public.questions (exam_id, position, text, options, correct_index, explanation, marks, bank_id)
  select v_new_id, position, text, options, correct_index, explanation, marks, bank_id
  from public.questions
  where exam_id = p_exam_id
  order by position;

  return v_new_id;
end;
$$;

grant execute on function public.duplicate_exam(uuid, text) to authenticated;

-- 7. Student Join RPC with code_attempts rate limiting & one generic error message
create or replace function public.join_exam_by_codes(
  p_teacher_code text,
  p_exam_code text,
  p_ip text default 'unknown'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_tcode text := upper(trim(coalesce(p_teacher_code, '')));
  v_ecode text := upper(trim(coalesce(p_exam_code, '')));
  v_ip text := coalesce(nullif(trim(p_ip), ''), 'unknown');
  v_rl public.code_attempts%rowtype;
  v_max_ip_block timestamptz;
  v_teacher_id uuid;
  v_teacher_name text;
  v_exam public.exams%rowtype;
  v_attempt public.attempts%rowtype;
  v_now timestamptz := now();
  v_total_marks numeric(8,2);
  v_wait_seconds integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED', 'message', 'Please sign in first.');
  end if;

  select role into v_role from public.profiles where id = v_uid;
  if v_role <> 'student' then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'Only student accounts can join exams.');
  end if;

  perform public.finalize_expired_attempts();

  select * into v_rl
  from public.code_attempts
  where user_id = v_uid and ip = v_ip;

  if found and v_rl.blocked_until is not null and v_rl.blocked_until > v_now then
    v_wait_seconds := ceil(extract(epoch from (v_rl.blocked_until - v_now)))::integer;
    return jsonb_build_object(
      'ok', false,
      'code', 'RATE_LIMITED',
      'wait_seconds', v_wait_seconds,
      'message', format('Too many incorrect code attempts. Try again in %s seconds.', v_wait_seconds)
    );
  end if;

  select max(blocked_until) into v_max_ip_block
  from public.code_attempts
  where ip = v_ip and blocked_until > v_now;

  if v_max_ip_block is not null then
    v_wait_seconds := ceil(extract(epoch from (v_max_ip_block - v_now)))::integer;
    return jsonb_build_object(
      'ok', false,
      'code', 'RATE_LIMITED',
      'wait_seconds', v_wait_seconds,
      'message', format('Too many incorrect code attempts. Try again in %s seconds.', v_wait_seconds)
    );
  end if;

  select tp.user_id, p.name
  into v_teacher_id, v_teacher_name
  from public.teacher_profiles tp
  join public.profiles p on p.id = tp.user_id
  where lower(tp.teacher_code) = lower(v_tcode);

  if v_teacher_id is not null then
    select * into v_exam
    from public.exams
    where teacher_id = v_teacher_id
      and lower(code) = lower(v_ecode);
  end if;

  if v_teacher_id is null or v_exam.id is null or v_exam.status = 'draft' then
    insert into public.code_attempts (user_id, ip, failed_count, blocked_until)
    values (v_uid, v_ip, 1, null)
    on conflict (user_id, ip) do update
      set failed_count = public.code_attempts.failed_count + 1,
          blocked_until = case
            when public.code_attempts.failed_count + 1 >= 12 then v_now + interval '10 minutes'
            when public.code_attempts.failed_count + 1 >= 8 then v_now + interval '2 minutes'
            when public.code_attempts.failed_count + 1 >= 5 then v_now + interval '30 seconds'
            else null
          end;

    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_CODES',
      'message', 'Invalid Teacher Code or Exam Code, or the exam is not open.'
    );
  end if;

  delete from public.code_attempts where user_id = v_uid and ip = v_ip;

  select * into v_attempt
  from public.attempts
  where exam_id = v_exam.id and student_id = v_uid;

  if found and v_attempt.status in ('submitted', 'auto_submitted') then
    return jsonb_build_object(
      'ok', true,
      'state', 'already_submitted',
      'exam_id', v_exam.id,
      'attempt_id', v_attempt.id
    );
  end if;

  if found and v_attempt.status = 'in_progress' then
    return jsonb_build_object(
      'ok', true,
      'state', 'resume',
      'exam_id', v_exam.id,
      'attempt_id', v_attempt.id
    );
  end if;

  if v_exam.status = 'closed' then
    return jsonb_build_object(
      'ok', false,
      'code', 'EXAM_CLOSED',
      'message', 'This exam is closed and no longer accepting new entries.'
    );
  end if;

  if v_exam.schedule_enabled then
    if v_exam.opens_at is not null and v_now < v_exam.opens_at then
      return jsonb_build_object(
        'ok', false,
        'code', 'NOT_OPEN_YET',
        'opens_at', v_exam.opens_at,
        'message', 'This scheduled exam has not opened yet.'
      );
    end if;
    if v_exam.closes_at is not null and v_now >= v_exam.closes_at then
      return jsonb_build_object(
        'ok', false,
        'code', 'EXAM_CLOSED',
        'message', 'This scheduled exam window has ended.'
      );
    end if;
  end if;

  select coalesce(sum(marks), 0) into v_total_marks
  from public.questions
  where exam_id = v_exam.id;

  return jsonb_build_object(
    'ok', true,
    'state', 'ready',
    'exam', jsonb_build_object(
      'id', v_exam.id,
      'name', v_exam.name,
      'subject', v_exam.subject,
      'medium', v_exam.medium,
      'teacher_name', v_teacher_name,
      'question_count', v_exam.question_count,
      'total_marks', v_total_marks,
      'duration_minutes', v_exam.duration_minutes,
      'negative_marking', v_exam.negative_marking,
      'negative_value', v_exam.negative_value,
      'instructions', v_exam.instructions,
      'schedule_enabled', v_exam.schedule_enabled,
      'closes_at', v_exam.closes_at,
      'result_release', v_exam.result_release
    )
  );
end;
$$;

grant execute on function public.join_exam_by_codes(text, text, text) to authenticated;

-- 8. Student Instructions Lookup (by exam_id)
create or replace function public.get_exam_instructions(p_exam_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_exam public.exams%rowtype;
  v_teacher_name text;
  v_attempt public.attempts%rowtype;
  v_total_marks numeric(8,2);
  v_now timestamptz := now();
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED');
  end if;

  select role into v_role from public.profiles where id = v_uid;
  if v_role <> 'student' then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  end if;

  perform public.finalize_expired_attempts();

  select * into v_exam from public.exams where id = p_exam_id;
  if not found or v_exam.status = 'draft' then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;

  select name into v_teacher_name from public.profiles where id = v_exam.teacher_id;

  select * into v_attempt
  from public.attempts
  where exam_id = p_exam_id and student_id = v_uid;

  if found and v_attempt.status in ('submitted', 'auto_submitted') then
    return jsonb_build_object('ok', true, 'state', 'already_submitted', 'attempt_id', v_attempt.id);
  end if;

  if found and v_attempt.status = 'in_progress' then
    return jsonb_build_object('ok', true, 'state', 'resume', 'attempt_id', v_attempt.id);
  end if;

  if v_exam.status = 'closed' then
    return jsonb_build_object('ok', false, 'code', 'EXAM_CLOSED');
  end if;

  if v_exam.schedule_enabled then
    if v_exam.opens_at is not null and v_now < v_exam.opens_at then
      return jsonb_build_object('ok', false, 'code', 'NOT_OPEN_YET', 'opens_at', v_exam.opens_at);
    end if;
    if v_exam.closes_at is not null and v_now >= v_exam.closes_at then
      return jsonb_build_object('ok', false, 'code', 'EXAM_CLOSED');
    end if;
  end if;

  select coalesce(sum(marks), 0) into v_total_marks
  from public.questions where exam_id = p_exam_id;

  return jsonb_build_object(
    'ok', true,
    'state', 'ready',
    'exam', jsonb_build_object(
      'id', v_exam.id,
      'name', v_exam.name,
      'subject', v_exam.subject,
      'medium', v_exam.medium,
      'teacher_name', v_teacher_name,
      'question_count', v_exam.question_count,
      'total_marks', v_total_marks,
      'duration_minutes', v_exam.duration_minutes,
      'negative_marking', v_exam.negative_marking,
      'negative_value', v_exam.negative_value,
      'instructions', v_exam.instructions,
      'schedule_enabled', v_exam.schedule_enabled,
      'closes_at', v_exam.closes_at,
      'result_release', v_exam.result_release
    )
  );
end;
$$;

grant execute on function public.get_exam_instructions(uuid) to authenticated;

-- 9. Start or Resume Exam Attempt (strips correct_index and explanation strictly)
create or replace function public.start_or_resume_attempt(
  p_exam_id uuid,
  p_session_id text,
  p_ip text default 'unknown',
  p_user_agent text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_exam public.exams%rowtype;
  v_attempt public.attempts%rowtype;
  v_now timestamptz := now();
  v_deadline timestamptz;
  v_q_order jsonb := '[]'::jsonb;
  v_opt_orders jsonb := '{}'::jsonb;
  v_q_meta record;
  v_q_row record;
  v_perm jsonb;
  v_questions_payload jsonb := '[]'::jsonb;
  v_last_event record;
  v_event_type text := 'resumed';
  v_q_item jsonb;
  v_opts_array jsonb;
  v_display_opts jsonb;
  v_idx_elem integer;
  v_qid text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED');
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found or v_profile.role <> 'student' then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  end if;

  if coalesce(trim(p_session_id), '') = '' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_SESSION');
  end if;

  perform public.finalize_expired_attempts();

  select * into v_exam from public.exams where id = p_exam_id;
  if not found or v_exam.status = 'draft' then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;

  select * into v_attempt
  from public.attempts
  where exam_id = p_exam_id and student_id = v_uid
  for update;

  if found then
    if v_attempt.status in ('submitted', 'auto_submitted') then
      return jsonb_build_object('ok', false, 'code', 'ALREADY_SUBMITTED', 'attempt_id', v_attempt.id);
    end if;

    if v_exam.status = 'closed' and v_exam.force_close_active then
      return jsonb_build_object('ok', false, 'code', 'EXAM_CLOSED');
    end if;

    if v_attempt.active_session_id <> p_session_id then
      select ip, user_agent into v_last_event
      from public.entry_events
      where exam_id = p_exam_id and student_id = v_uid
      order by created_at desc
      limit 1;

      if v_last_event.ip is not null and (v_last_event.ip <> p_ip or v_last_event.user_agent <> left(coalesce(p_user_agent, ''), 300)) then
        v_event_type := 'second_device';
      else
        v_event_type := 'new_tab';
      end if;

      update public.attempts
      set active_session_id = p_session_id
      where id = v_attempt.id
      returning * into v_attempt;

      insert into public.entry_events (exam_id, student_id, event_type, ip, user_agent)
      values (p_exam_id, v_uid, v_event_type, p_ip, left(coalesce(p_user_agent, ''), 300));
    end if;
  else
    if v_exam.status <> 'published' then
      return jsonb_build_object('ok', false, 'code', 'EXAM_CLOSED');
    end if;

    if v_exam.schedule_enabled then
      if v_exam.opens_at is not null and v_now < v_exam.opens_at then
        return jsonb_build_object('ok', false, 'code', 'NOT_OPEN_YET', 'opens_at', v_exam.opens_at);
      end if;
      if v_exam.closes_at is not null and v_now >= v_exam.closes_at then
        return jsonb_build_object('ok', false, 'code', 'EXAM_CLOSED');
      end if;
    end if;

    v_deadline := v_now + make_interval(mins => v_exam.duration_minutes);
    if v_exam.schedule_enabled and v_exam.closes_at is not null then
      v_deadline := least(v_deadline, v_exam.closes_at);
    end if;

    if v_exam.shuffle_questions then
      select coalesce(jsonb_agg(q.id order by random()), '[]'::jsonb)
      into v_q_order
      from public.questions q
      where q.exam_id = p_exam_id;
    else
      select coalesce(jsonb_agg(q.id order by q.position), '[]'::jsonb)
      into v_q_order
      from public.questions q
      where q.exam_id = p_exam_id;
    end if;

    if jsonb_array_length(v_q_order) = 0 then
      return jsonb_build_object('ok', false, 'code', 'NO_QUESTIONS');
    end if;

    for v_q_meta in
      select id, jsonb_array_length(options) as opt_len
      from public.questions
      where exam_id = p_exam_id
    loop
      if v_exam.shuffle_options then
        select jsonb_agg(i order by random())
        into v_perm
        from generate_series(0, v_q_meta.opt_len - 1) as i;
      else
        select jsonb_agg(i order by i)
        into v_perm
        from generate_series(0, v_q_meta.opt_len - 1) as i;
      end if;
      v_opt_orders := v_opt_orders || jsonb_build_object(v_q_meta.id::text, v_perm);
    end loop;

    insert into public.attempts (
      exam_id, student_id, student_name, student_roll,
      started_at, deadline_at, status,
      question_order, option_orders, active_session_id
    )
    values (
      p_exam_id, v_uid, v_profile.name, v_profile.roll,
      v_now, v_deadline, 'in_progress',
      v_q_order, v_opt_orders, p_session_id
    )
    returning * into v_attempt;

    insert into public.entry_events (exam_id, student_id, event_type, ip, user_agent)
    values (p_exam_id, v_uid, 'joined', p_ip, left(coalesce(p_user_agent, ''), 300));
  end if;

  for v_qid in
    select value from jsonb_array_elements_text(v_attempt.question_order)
  loop
    select id, text, options, marks
    into v_q_row
    from public.questions
    where id = v_qid::uuid and exam_id = p_exam_id;

    if found then
      v_opts_array := v_q_row.options;
      v_perm := coalesce(v_attempt.option_orders -> v_qid, '[]'::jsonb);
      v_display_opts := '[]'::jsonb;

      for v_idx_elem in
        select (value)::integer from jsonb_array_elements_text(v_perm)
      loop
        if v_idx_elem >= 0 and v_idx_elem < jsonb_array_length(v_opts_array) then
          v_display_opts := v_display_opts || jsonb_build_array(
            jsonb_build_object(
              'canonicalIndex', v_idx_elem,
              'text', v_opts_array -> v_idx_elem
            )
          );
        end if;
      end loop;

      v_q_item := jsonb_build_object(
        'id', v_q_row.id,
        'text', v_q_row.text,
        'marks', v_q_row.marks,
        'options', v_display_opts
      );
      v_questions_payload := v_questions_payload || jsonb_build_array(v_q_item);
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'server_now', v_now,
    'attempt', jsonb_build_object(
      'id', v_attempt.id,
      'exam_id', v_attempt.exam_id,
      'student_name', v_attempt.student_name,
      'student_roll', v_attempt.student_roll,
      'started_at', v_attempt.started_at,
      'deadline_at', v_attempt.deadline_at,
      'draft_answers', v_attempt.draft_answers,
      'client_seq', v_attempt.client_seq,
      'violation_counts', v_attempt.violation_counts
    ),
    'exam', jsonb_build_object(
      'id', v_exam.id,
      'name', v_exam.name,
      'subject', v_exam.subject,
      'medium', v_exam.medium,
      'negative_marking', v_exam.negative_marking,
      'negative_value', v_exam.negative_value
    ),
    'questions', v_questions_payload
  );
end;
$$;

grant execute on function public.start_or_resume_attempt(uuid, text, text, text) to authenticated;

-- 10. Sync Draft Answers & Violation Counts
create or replace function public.sync_attempt_draft(
  p_attempt_id uuid,
  p_session_id text,
  p_draft_answers jsonb,
  p_client_seq integer,
  p_violation_counts jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_attempt public.attempts%rowtype;
  v_now timestamptz := now();
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED');
  end if;

  select * into v_attempt
  from public.attempts
  where id = p_attempt_id and student_id = v_uid
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;

  if v_attempt.status <> 'in_progress' then
    return jsonb_build_object('ok', false, 'code', 'ALREADY_SUBMITTED');
  end if;

  if v_attempt.active_session_id <> p_session_id then
    return jsonb_build_object('ok', false, 'code', 'SESSION_TAKEN_OVER');
  end if;

  if v_now > v_attempt.deadline_at + interval '30 seconds' then
    perform public.finalize_expired_attempts();
    return jsonb_build_object('ok', false, 'code', 'EXPIRED');
  end if;

  update public.attempts
  set
    draft_answers = case
      when p_client_seq >= v_attempt.client_seq then coalesce(p_draft_answers, '{}'::jsonb)
      else v_attempt.draft_answers
    end,
    client_seq = greatest(v_attempt.client_seq, p_client_seq),
    violation_counts = coalesce(p_violation_counts, v_attempt.violation_counts)
  where id = v_attempt.id;

  return jsonb_build_object('ok', true, 'synced_at', v_now);
end;
$$;

grant execute on function public.sync_attempt_draft(uuid, text, jsonb, integer, jsonb) to authenticated;

-- 11. Submit Attempt & Grade on Server
create or replace function public.submit_exam_attempt(
  p_attempt_id uuid,
  p_session_id text,
  p_answers jsonb,
  p_violation_counts jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_attempt public.attempts%rowtype;
  v_exam public.exams%rowtype;
  v_graded record;
  v_now timestamptz := now();
  v_final_answers jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED');
  end if;

  select * into v_attempt
  from public.attempts
  where id = p_attempt_id and student_id = v_uid
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;

  if v_attempt.status in ('submitted', 'auto_submitted') then
    return jsonb_build_object('ok', true, 'already_submitted', true, 'attempt_id', v_attempt.id);
  end if;

  if v_attempt.active_session_id <> p_session_id then
    return jsonb_build_object('ok', false, 'code', 'SESSION_TAKEN_OVER');
  end if;

  select * into v_exam from public.exams where id = v_attempt.exam_id;

  if v_now > v_attempt.deadline_at + interval '30 seconds' then
    v_final_answers := v_attempt.draft_answers;
  else
    v_final_answers := coalesce(p_answers, v_attempt.draft_answers, '{}'::jsonb);
  end if;

  select * into v_graded from public.score_exam_answers(
    v_attempt.exam_id,
    v_exam.negative_marking,
    v_exam.negative_value,
    v_final_answers
  );

  update public.attempts
  set
    draft_answers = v_final_answers,
    answers = v_final_answers,
    score = v_graded.out_score,
    total_marks = v_graded.out_total,
    violation_counts = coalesce(p_violation_counts, v_attempt.violation_counts),
    status = case
      when v_now > v_attempt.deadline_at + interval '30 seconds' then 'auto_submitted'
      else 'submitted'
    end,
    submitted_at = least(v_now, v_attempt.deadline_at)
  where id = v_attempt.id
  returning * into v_attempt;

  return jsonb_build_object(
    'ok', true,
    'attempt_id', v_attempt.id,
    'status', v_attempt.status,
    'submitted_at', v_attempt.submitted_at
  );
end;
$$;

grant execute on function public.submit_exam_attempt(uuid, text, jsonb, jsonb) to authenticated;

-- 12. Student Submitted Confirmation & Gated Result Summary
create or replace function public.get_student_submitted_summary(p_exam_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_attempt public.attempts%rowtype;
  v_exam public.exams%rowtype;
  v_released boolean := false;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED');
  end if;

  perform public.finalize_expired_attempts();

  select * into v_attempt
  from public.attempts
  where exam_id = p_exam_id and student_id = v_uid;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;

  if v_attempt.status = 'in_progress' then
    return jsonb_build_object('ok', false, 'code', 'IN_PROGRESS');
  end if;

  select * into v_exam from public.exams where id = p_exam_id;

  v_released :=
    v_exam.result_release = 'after_submit'
    or (v_exam.result_release = 'after_close' and v_exam.status = 'closed')
    or (v_exam.result_release = 'manual' and v_exam.results_released_at is not null);

  return jsonb_build_object(
    'ok', true,
    'exam', jsonb_build_object(
      'id', v_exam.id,
      'name', v_exam.name,
      'subject', v_exam.subject,
      'medium', v_exam.medium,
      'result_release', v_exam.result_release,
      'show_answers', v_exam.show_answers
    ),
    'attempt', jsonb_build_object(
      'id', v_attempt.id,
      'status', v_attempt.status,
      'started_at', v_attempt.started_at,
      'submitted_at', v_attempt.submitted_at,
      'results_released', v_released,
      'score', case when v_released then v_attempt.score else null end,
      'total_marks', case when v_released then v_attempt.total_marks else null end
    )
  );
end;
$$;

grant execute on function public.get_student_submitted_summary(uuid) to authenticated;
