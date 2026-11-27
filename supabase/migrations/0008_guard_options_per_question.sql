-- 0008: Keep options_per_question locked when questions already exist, even if exam is closed
-- Duration, negative marking, and shuffle remain editable after closing an exam.

create or replace function public.guard_exam_structural_edits()
returns trigger
language plpgsql
as $$
begin
  if old.question_count > 0 and new.options_per_question is distinct from old.options_per_question then
    raise exception 'Options per question cannot be changed after questions have been added.';
  end if;

  if old.status <> 'closed' and exists (select 1 from public.attempts where exam_id = old.id) then
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
