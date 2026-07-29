-- Add status column to profiles for approval flow
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'status'
  ) then
    alter table public.profiles add column status text not null default 'pending';
    comment on column public.profiles.status is 'pending | active | declined';
  end if;
end $$;

-- Update the trigger function to set pending status on new signups
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role app_role := 'viewer';
begin
  requested_role := 'viewer';

  insert into public.profiles (id, full_name, email, status)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    'pending'
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email;

  insert into public.user_roles (user_id, role)
  values (new.id, requested_role)
  on conflict do nothing;

  return new;
end;
$$;

-- RLS: allow users to see their own profile, admins to see all
drop policy if exists "users_read_own_profile" on public.profiles;
create policy "users_read_own_profile"
  on public.profiles for select
  using (
    auth.uid() = id
    or
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

drop policy if exists "admin_update_profile_status" on public.profiles;
create policy "admin_update_profile_status"
  on public.profiles for update
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));