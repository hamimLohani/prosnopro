-- 0005: Add class field to exams and wire it into duplicate_exam + practice search

alter table public.exams
  add column if not exists class text not null default '';

create index if not exists exams_teacher_class_idx
  on public.exams (teacher_id, lower(class));

-- Keep duplicate_exam in sync so duplicated exams preserve class
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
    teacher_id, name, subject, class, medium, duration_minutes, options_per_question,
    default_marks, negative_marking, negative_value, shuffle_questions, shuffle_options,
    schedule_enabled, opens_at, closes_at, force_close_active, instructions,
    result_release, show_answers, practice_sharing, code, status
  )
  values (
    v_uid, v_src.name || ' (Copy)', v_src.subject, v_src.class, v_src.medium, v_src.duration_minutes,
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

-- Update practice search so closed exams expose their exam.class for class filtering
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
      e.class,
      e.medium,
      e.name as source_label,
      q.created_at
    from public.questions q
    join public.exams e on e.id = q.exam_id
    where e.status = 'closed'
      and e.practice_sharing = true
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
        'id', id,
        'text', text,
        'options', options,
        'correct_index', correct_index,
        'explanation', explanation,
        'subject', subject,
        'class', class,
        'medium', medium,
        'source_label', source_label
      )
    ),
    '[]'::jsonb
  )
  into v_items
  from filtered;

  return jsonb_build_object('ok', true, 'items', v_items);
end;
$$;
