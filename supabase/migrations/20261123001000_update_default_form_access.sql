-- Preserve current matrix values so this one-time default change can be rolled back.
create table if not exists public.role_form_permissions_backup_before_20261123001000 (
  role_code public.app_role not null,
  form_key text not null,
  can_access boolean not null,
  primary key (role_code, form_key)
);

insert into public.role_form_permissions_backup_before_20261123001000 (role_code, form_key, can_access)
select role_code, form_key, can_access
from public.role_form_permissions
on conflict (role_code, form_key) do nothing;

-- Apply the spreadsheet defaults across all known roles and forms.
insert into public.role_form_permissions (role_code, form_key, can_access)
select r.code, f.form_key,
  case
    when r.code in ('admin', 'super_admin') then true
    when f.form_key = 'supplies_ris' then true
    when f.form_key in ('semi_ris', 'ppe_ris') then r.code = 'permanent_employee'
    when f.form_key in ('supplies_iar', 'semi_iar', 'ppe_iar')
      then r.code in ('supply_officer', 'inspection_officer')
    when f.form_key in ('supplies_rsmi', 'supplies_rpci', 'semi_splc', 'semi_rspi', 'ppe_ppelc')
      then r.code in ('supply_officer', 'financial_analyst')
    else false
  end
from public.roles r
cross join public.forms f
on conflict (role_code, form_key) do update
set can_access = excluded.can_access;

-- Rollback: delete current role_form_permissions rows, then restore the snapshot:
-- insert into public.role_form_permissions (role_code, form_key, can_access)
-- select role_code, form_key, can_access
-- from public.role_form_permissions_backup_before_20261123001000;
