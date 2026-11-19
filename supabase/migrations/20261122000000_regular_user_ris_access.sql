insert into public.role_form_permissions (role_code, form_key, can_access)
values
  ('regular_user', 'semi_ris', true),
  ('regular_user', 'ppe_ris', true)
on conflict (role_code, form_key) do update set can_access = excluded.can_access;

create or replace function public.role_access_allowed(_roles public.app_role[], _employment_status text, _form_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from unnest(coalesce(_roles, array[]::public.app_role[])) assigned(role)
    join public.role_form_permissions p on p.role_code = assigned.role
    where p.form_key = _form_key and p.can_access
      and (assigned.role <> 'permanent_employee' or _employment_status = 'Permanent')
  );
$$;
