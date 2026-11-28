-- Prevent authenticated or anonymous clients from mutating their own role on public.profiles.
-- Onboarding and role assignment happen exclusively via security-definer RPCs.

revoke update (role) on public.profiles from anon, authenticated;

create or replace function public.guard_profile_role_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    raise exception 'Role cannot be changed directly.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role_update on public.profiles;
create trigger profiles_guard_role_update
before update on public.profiles
for each row execute function public.guard_profile_role_update();
