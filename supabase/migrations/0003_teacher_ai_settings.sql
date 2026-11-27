-- ProsnoPro Step 6 (Early): Teacher BYOK AI Key Metadata
-- Run after 0002_step2_exam_rpc.sql in Supabase SQL Editor.

alter table public.teacher_profiles
  add column if not exists ai_model text,
  add column if not exists ai_key_hint text;

-- Safe RPC so teachers see whether their key is saved without ever returning ai_key_encrypted
create or replace function public.get_teacher_ai_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tp record;
begin
  if v_uid is null then
    return jsonb_build_object('has_key', false);
  end if;

  select ai_provider, ai_model, ai_key_hint, (ai_key_encrypted is not null) as has_key
  into v_tp
  from public.teacher_profiles
  where user_id = v_uid;

  if not found then
    return jsonb_build_object('has_key', false);
  end if;

  return jsonb_build_object(
    'ai_provider', v_tp.ai_provider,
    'ai_model', v_tp.ai_model,
    'ai_key_hint', v_tp.ai_key_hint,
    'has_key', coalesce(v_tp.has_key, false)
  );
end;
$$;

grant execute on function public.get_teacher_ai_status() to authenticated;
