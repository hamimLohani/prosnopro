-- 0007: Allow deleting an exam even when students have started attempts
-- Previously, ON DELETE CASCADE on questions triggered guard_question_structural_edits()
-- and raised "Questions cannot be added or deleted after students have started."

create or replace function public.mark_exam_deleting()
returns trigger
language plpgsql
as $$
begin
  perform set_config('app.deleting_exam_id', old.id::text, true);
  return old;
end;
$$;

drop trigger if exists exams_mark_deleting on public.exams;
create trigger exams_mark_deleting
before delete on public.exams
for each row execute function public.mark_exam_deleting();

create or replace function public.guard_question_structural_edits()
returns trigger
language plpgsql
as $$
declare
  v_exam_id uuid := coalesce(new.exam_id, old.exam_id);
begin
  if tg_op = 'DELETE' and current_setting('app.deleting_exam_id', true) = v_exam_id::text then
    return old;
  end if;

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
