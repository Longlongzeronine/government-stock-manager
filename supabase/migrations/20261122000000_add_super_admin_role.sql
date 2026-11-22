-- Add Super Admin role to the app_role enum and supporting tables.
-- Enums can only be added (never removed) in PostgreSQL.
alter type public.app_role add value if not exists 'super_admin';

-- Role metadata row.
insert into public.roles (code, label, is_system_admin) values
  ('super_admin', 'Super Admin', true)
on conflict (code) do update set label = excluded.label, is_system_admin = excluded.is_system_admin;

-- Extend the user_roles check constraint to include super_admin.
alter table public.user_roles drop constraint if exists user_roles_allowed_role;
alter table public.user_roles add constraint user_roles_allowed_role check (
  role::text in ('admin', 'super_admin', 'regular_user', 'permanent_employee', 'supply_officer', 'inspection_officer', 'financial_analyst')
) not valid;
alter table public.user_roles validate constraint user_roles_allowed_role;

-- Super Admin gets access to every form (seed rows; hardcoded bypass also applies).
insert into public.role_form_permissions (role_code, form_key, can_access)
select 'super_admin', f.form_key, true
from public.forms f
on conflict (role_code, form_key) do update set can_access = excluded.can_access;

-- Update user_can_access_form so Super Admin bypasses all form checks.
create or replace function public.user_can_access_form(_user_id uuid, _form_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select public.has_role(_user_id, 'super_admin')
    or public.has_role(_user_id, 'admin')
    or public.role_access_allowed(
      array(select ur.role from public.user_roles ur where ur.user_id = _user_id),
      (select employment_status from public.profiles p where p.id = _user_id),
      _form_key
    )
  ), false);
$$;

-- Update admin_replace_user_roles to accept super_admin and enforce the max-2 limit.
create or replace function public.admin_replace_user_roles(
  _changed_by uuid,
  _user_id uuid,
  _roles public.app_role[],
  _employment_status text
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_old_roles public.app_role[];
  v_is_super_admin_change boolean := false;
  v_target_has_sa boolean := false;
  v_new_has_sa boolean := false;
  v_super_admin_count int;
begin
  if not public.has_role(_changed_by, 'super_admin') then
    raise exception 'Super Admin access required';
  end if;
  if coalesce(array_length(_roles, 1), 0) < 1 then
    raise exception 'At least one role is required';
  end if;
  if exists (
    select 1 from unnest(_roles) as assigned(role)
    where role not in ('super_admin','admin','regular_user','permanent_employee','supply_officer','inspection_officer','financial_analyst')
  ) then
    raise exception 'Invalid role assignment';
  end if;
  if _employment_status not in ('Permanent','Casual','Contractual','Job Order') then
    raise exception 'Invalid employment status';
  end if;

  -- Detect Super Admin role changes.
  v_target_has_sa := exists (
    select 1 from public.user_roles where user_id = _user_id and role = 'super_admin'
  );
  v_new_has_sa := 'super_admin' = any(_roles);
  v_is_super_admin_change := v_target_has_sa <> v_new_has_sa;

  select coalesce(array_agg(role order by role), array[]::public.app_role[])
  into v_old_roles
  from public.user_roles where user_id = _user_id;

  update public.profiles set employment_status = _employment_status where id = _user_id;
  if not found then
    raise exception 'User profile not found';
  end if;

  delete from public.user_roles where user_id = _user_id;
  insert into public.user_roles(user_id, role)
  select _user_id, assigned_role from (select distinct unnest(_roles) assigned_role) assigned;

  -- Enforce max-2 Super Admin limit when adding Super Admin.
  if v_new_has_sa and not v_target_has_sa then
    select count(*) into v_super_admin_count
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.role = 'super_admin' and p.status = 'active' and p.disabled = false;
    if v_super_admin_count > 2 then
      raise exception 'The maximum of 2 Super Admin accounts has been reached. Delete an existing Super Admin account before creating a new one.';
    end if;
  end if;

  -- Guard: last remaining Super Admin cannot be demoted or deleted (roles cleared).
  if v_is_super_admin_change and not v_new_has_sa then
    select count(*) into v_super_admin_count
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.role = 'super_admin' and p.status = 'active' and p.disabled = false;
    if v_super_admin_count < 1 then
      raise exception 'At least one Super Admin account must remain. Cannot demote the last Super Admin.';
    end if;
  end if;

  insert into public.role_change_logs(changed_by, user_id, old_roles, new_roles)
  values (_changed_by, _user_id, v_old_roles, array(select distinct unnest(_roles)));
end;
$$;
grant execute on function public.admin_replace_user_roles(uuid, uuid, public.app_role[], text) to authenticated, service_role;

-- RPC to check and enforce Super Admin limit before granting Super Admin.
create or replace function public.enforce_super_admin_limit(_target_user_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.user_roles ur
  join public.profiles p on p.id = ur.user_id
  where ur.role = 'super_admin' and p.status = 'active' and p.disabled = false;
  if v_count >= 2 then
    raise exception 'The maximum of 2 Super Admin accounts has been reached. Delete an existing Super Admin account before creating a new one.';
  end if;
  return true;
end;
$$;
grant execute on function public.enforce_super_admin_limit(uuid) to authenticated, service_role;