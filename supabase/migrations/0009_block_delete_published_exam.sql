-- 0009: Prevent deleting a published exam before closing it first
-- Updates mark_exam_deleting() (runs BEFORE DELETE on public.exams) so live
-- exams must be closed before they can be deleted, while preserving draft
-- deletion and attempt-safe closed exam deletion from migration 0007.

create or replace function public.mark_exam_deleting()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'published' then
    raise exception 'Close the exam before deleting it.';
  end if;

  perform set_config('app.deleting_exam_id', old.id::text, true);
  return old;
end;
$$;
