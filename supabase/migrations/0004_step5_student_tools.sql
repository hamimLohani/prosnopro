-- ProsnoPro Step 5: Student Results History, Gated Result Detail & Practice Search
-- Run after 0003_teacher_ai_settings.sql in Supabase SQL Editor.

-- 1. Student attempt history (gates scores by result_release)
create or replace function public.get_student_results_history()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rows jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED');
  end if;

  perform public.finalize_expired_attempts();

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'attempt_id', a.id,
        'exam_id', e.id,
        'exam_name', e.name,
        'subject', e.subject,
        'medium', e.medium,
        'status', a.status,
        'started_at', a.started_at,
        'submitted_at', a.submitted_at,
        'result_release', e.result_release,
        'show_answers', e.show_answers,
        'results_released', (
          e.result_release = 'after_submit'
          or (e.result_release = 'after_close' and e.status = 'closed')
          or (e.result_release = 'manual' and e.results_released_at is not null)
        ),
        'score', case
          when (
            e.result_release = 'after_submit'
            or (e.result_release = 'after_close' and e.status = 'closed')
            or (e.result_release = 'manual' and e.results_released_at is not null)
          ) then a.score
          else null
        end,
        'total_marks', case
          when (
            e.result_release = 'after_submit'
            or (e.result_release = 'after_close' and e.status = 'closed')
            or (e.result_release = 'manual' and e.results_released_at is not null)
          ) then a.total_marks
          else null
        end
      )
      order by a.started_at desc
    ),
    '[]'::jsonb
  )
  into v_rows
  from public.attempts a
  join public.exams e on e.id = a.exam_id
  where a.student_id = v_uid;

  return jsonb_build_object('ok', true, 'items', v_rows);
end;
$$;

grant execute on function public.get_student_results_history() to authenticated;

-- 2. Student result detail (gates score by result_release and correct_index/explanation by show_answers)
create or replace function public.get_student_result_detail(p_attempt_id uuid)
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
  v_questions jsonb := '[]'::jsonb;
  v_qid text;
  v_q record;
  v_answer_map jsonb;
  v_chosen_text text;
  v_chosen_idx integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED');
  end if;

  perform public.finalize_expired_attempts();

  select * into v_attempt
  from public.attempts
  where id = p_attempt_id and student_id = v_uid;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;

  if v_attempt.status = 'in_progress' then
    return jsonb_build_object('ok', false, 'code', 'IN_PROGRESS', 'exam_id', v_attempt.exam_id);
  end if;

  select * into v_exam from public.exams where id = v_attempt.exam_id;

  v_released :=
    v_exam.result_release = 'after_submit'
    or (v_exam.result_release = 'after_close' and v_exam.status = 'closed')
    or (v_exam.result_release = 'manual' and v_exam.results_released_at is not null);

  if v_released then
    v_answer_map := coalesce(v_attempt.answers, v_attempt.draft_answers, '{}'::jsonb);
    for v_qid in
      select value from jsonb_array_elements_text(v_attempt.question_order)
    loop
      select id, text, options, correct_index, explanation, marks
      into v_q
      from public.questions
      where id = v_qid::uuid and exam_id = v_exam.id;

      if found then
        v_chosen_text := v_answer_map ->> v_qid;
        v_chosen_idx := case
          when v_chosen_text is not null and v_chosen_text ~ '^[0-9]+$' then v_chosen_text::integer
          else null
        end;

        v_questions := v_questions || jsonb_build_array(
          jsonb_build_object(
            'id', v_q.id,
            'text', v_q.text,
            'options', v_q.options,
            'marks', v_q.marks,
            'chosen_index', v_chosen_idx,
            'correct_index', case when v_exam.show_answers then v_q.correct_index else null end,
            'explanation', case when v_exam.show_answers then v_q.explanation else null end
          )
        );
      end if;
    end loop;
  end if;

  return jsonb_build_object(
    'ok', true,
    'exam', jsonb_build_object(
      'id', v_exam.id,
      'name', v_exam.name,
      'subject', v_exam.subject,
      'medium', v_exam.medium,
      'negative_marking', v_exam.negative_marking,
      'negative_value', v_exam.negative_value,
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
    ),
    'questions', v_questions
  );
end;
$$;

grant execute on function public.get_student_result_detail(uuid) to authenticated;

-- 3. Student practice search (blocked during active attempts; hides questions used in open/scheduled exams)
create or replace function public.search_student_practice_questions(
  p_keyword text default '',
  p_subject text default '',
  p_class text default '',
  p_medium text default 'all',
  p_limit integer default 30,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_active_exam_id uuid;
  v_kw text := trim(coalesce(p_keyword, ''));
  v_subj text := trim(coalesce(p_subject, ''));
  v_cls text := trim(coalesce(p_class, ''));
  v_med text := trim(coalesce(p_medium, 'all'));
  v_lim integer := least(50, greatest(1, coalesce(p_limit, 30)));
  v_off integer := greatest(0, coalesce(p_offset, 0));
  v_items jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED');
  end if;

  select role into v_role from public.profiles where id = v_uid;
  if v_role <> 'student' then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  end if;

  perform public.finalize_expired_attempts();

  select exam_id into v_active_exam_id
  from public.attempts
  where student_id = v_uid and status = 'in_progress'
  limit 1;

  if v_active_exam_id is not null then
    return jsonb_build_object(
      'ok', false,
      'code', 'ATTEMPT_IN_PROGRESS',
      'active_exam_id', v_active_exam_id,
      'message', 'Practice search is disabled while you have an exam attempt in progress.'
    );
  end if;

  with eligible_questions as (
    -- Source 1: Shared bank items NOT used in any currently published (open/scheduled) exam
    select
      qb.id,
      qb.text,
      qb.options,
      qb.correct_index,
      qb.explanation,
      qb.subject,
      qb.class,
      qb.medium,
      'Shared Bank'::text as source_label,
      qb.created_at
    from public.question_bank qb
    where qb.visibility = 'shared'
      and not exists (
        select 1
        from public.questions q
        join public.exams e on e.id = q.exam_id
        where q.bank_id = qb.id
          and e.status = 'published'
      )

    union all

    -- Source 2: Questions from closed exams with practice_sharing enabled
    select
      q.id,
      q.text,
      q.options,
      q.correct_index,
      q.explanation,
      e.subject,
      ''::text as class,
      e.medium,
      e.name as source_label,
      q.created_at
    from public.questions q
    join public.exams e on e.id = q.exam_id
    where e.status = 'closed'
      and e.practice_sharing = true
      -- Avoid exposing items linked to a bank question currently active in another published exam
      and (
        q.bank_id is null
        or not exists (
          select 1
          from public.questions q2
          join public.exams e2 on e2.id = q2.exam_id
          where q2.bank_id = q.bank_id
            and e2.status = 'published'
        )
      )
      -- Deduplicate if the linked bank item is already shared above
      and (
        q.bank_id is null
        or not exists (
          select 1 from public.question_bank qb2
          where qb2.id = q.bank_id and qb2.visibility = 'shared'
        )
      )
  ),
  filtered as (
    select *
    from eligible_questions eq
    where (v_med = 'all' or eq.medium = v_med)
      and (v_subj = '' or eq.subject ilike '%' || v_subj || '%')
      and (v_cls = '' or eq.class ilike '%' || v_cls || '%')
      and (
        v_kw = ''
        or eq.text ilike '%' || v_kw || '%'
        or eq.subject ilike '%' || v_kw || '%'
        or eq.class ilike '%' || v_kw || '%'
      )
    order by eq.created_at desc
    limit v_lim offset v_off
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', f.id,
        'text', f.text,
        'options', f.options,
        'correct_index', f.correct_index,
        'explanation', f.explanation,
        'subject', f.subject,
        'class', f.class,
        'medium', f.medium,
        'source_label', f.source_label
      )
    ),
    '[]'::jsonb
  )
  into v_items
  from filtered f;

  return jsonb_build_object('ok', true, 'items', v_items);
end;
$$;

grant execute on function public.search_student_practice_questions(text, text, text, text, integer, integer) to authenticated;
