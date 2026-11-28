create table if not exists public.roles (
  code public.app_role primary key,
  label text not null unique,
  is_system_admin boolean not null default false
);

insert into public.roles (code, label, is_system_admin) values
  ('admin', 'Administrator', true),
  ('regular_user', 'Regular User', false),
  ('permanent_employee', 'Permanent Employee', false),
  ('supply_officer', 'Supply Officer', false),
  ('inspection_officer', 'Inspection Officer', false),
  ('financial_analyst', 'Financial Analyst', false)
on conflict (code) do update set label = excluded.label, is_system_admin = excluded.is_system_admin;

create table if not exists public.forms (
  form_key text primary key,
  section text not null,
  label text not null,
  sort_order int not null default 0
);

insert into public.forms (form_key, section, label, sort_order) values
  -- Supplies & Materials
  ('supplies_iar', 'Supplies', 'IAR', 10),
  ('supplies_stock_card', 'Supplies', 'Stock Card', 12),
  ('supplies_ris', 'Supplies', 'RIS', 14),
  ('supplies_rsmi', 'Supplies', 'RSMI', 30),
  ('supplies_rpci', 'Supplies', 'RPCI', 18),
  -- Semi-Expendable Property
  ('semi_iar', 'Semi-Expendable Property', 'IAR', 50),
  ('semi_splc', 'Semi-Expendable Property', 'SPLC', 52),
  ('semi_spc', 'Semi-Expendable Property', 'SPC', 54),
  ('semi_ris', 'Semi-Expendable Property', 'RIS', 56),
  ('semi_ics', 'Semi-Expendable Property', 'ICS', 58),
  ('semi_itr', 'Semi-Expendable Property', 'ITR', 60),
  ('semi_rspi', 'Semi-Expendable Property', 'RSPI', 80),
  ('semi_regspi', 'Semi-Expendable Property', 'RegSPI', 82),
  ('semi_iirup', 'Semi-Expendable Property', 'IIRUP', 84),
  ('semi_rlsddp', 'Semi-Expendable Property', 'RLSDDP', 86),
  ('semi_rrpe', 'Semi-Expendable Property', 'RRPE', 88),
  ('semi_rpcsp', 'Semi-Expendable Property', 'RPCSP', 90),
  -- Property, Plant & Equipment
  ('ppe_iar', 'PPE', 'IAR', 100),
  ('ppe_ppelc', 'PPE', 'PPELC', 102),
  ('ppe_pc', 'PPE', 'PC', 104),
  ('ppe_ris', 'PPE', 'RIS', 106),
  ('ppe_par', 'PPE', 'PAR', 108),
  ('ppe_ptr', 'PPE', 'PTR', 110),
  ('ppe_rpcppe', 'PPE', 'RPCPPE', 112),
  ('ppe_iirup', 'PPE', 'IIRUP', 114),
  ('ppe_rlsddp', 'PPE', 'RLSDDP', 116),
  ('ppe_rrpe', 'PPE', 'RRPE', 118)
on conflict (form_key) do update set section = excluded.section, label = excluded.label, sort_order = excluded.sort_order;

create table if not exists public.role_form_permissions (
  role_code public.app_role not null references public.roles(code) on delete cascade,
  form_key text not null references public.forms(form_key) on delete cascade,
  can_access boolean not null default true,
  primary key (role_code, form_key)
);

alter table public.user_roles drop constraint if exists user_roles_allowed_role;
insert into public.user_roles (user_id, role)
select user_id, case role::text
  when 'viewer' then 'regular_user'::public.app_role
  when 'staff' then 'supply_officer'::public.app_role
  when 'accounting' then 'financial_analyst'::public.app_role
  when 'custodian' then 'supply_officer'::public.app_role
  when 'approver' then 'inspection_officer'::public.app_role
  else role
end
from public.user_roles
where role::text in ('viewer', 'staff', 'accounting', 'custodian', 'approver')
on conflict (user_id, role) do nothing;

delete from public.user_roles where role::text in ('viewer', 'staff', 'accounting', 'custodian', 'approver');
alter table public.user_roles drop constraint if exists user_roles_allowed_role;
alter table public.user_roles add constraint user_roles_allowed_role check (
  role::text in ('admin', 'regular_user', 'permanent_employee', 'supply_officer', 'inspection_officer', 'financial_analyst')
) not valid;
alter table public.user_roles validate constraint user_roles_allowed_role;
alter table public.user_roles alter column role set default 'regular_user';
alter table public.user_roles drop constraint if exists user_roles_role_catalog_fkey;
alter table public.user_roles add constraint user_roles_role_catalog_fkey foreign key (role) references public.roles(code);
drop policy if exists user_roles_admin_all on public.user_roles;

alter table public.profiles
  add column if not exists employment_status text not null default 'Casual',
  add column if not exists disabled boolean not null default false;
alter table public.profiles drop constraint if exists profiles_employment_status_check;
alter table public.profiles add constraint profiles_employment_status_check
  check (employment_status in ('Permanent', 'Casual', 'Contractual', 'Job Order')) not valid;
alter table public.profiles validate constraint profiles_employment_status_check;

insert into public.user_roles (user_id, role)
select p.id, 'regular_user'::public.app_role
from public.profiles p
where not exists (select 1 from public.user_roles ur where ur.user_id = p.id)
on conflict (user_id, role) do nothing;

insert into public.role_form_permissions (role_code, form_key, can_access)
select r.code, f.form_key, true
from public.roles r cross join public.forms f
where r.code in ('admin', 'regular_user', 'permanent_employee', 'supply_officer', 'inspection_officer', 'financial_analyst')
  and (
    r.code = 'admin'
    or (f.form_key = 'supplies_ris')
    or (f.form_key in ('semi_ris', 'ppe_ris') and r.code in ('regular_user', 'permanent_employee'))
    or (f.form_key in ('supplies_iar', 'semi_iar', 'ppe_iar') and r.code in ('supply_officer', 'inspection_officer'))
    or (f.form_key in ('supplies_rsmi', 'supplies_rpci', 'semi_splc', 'semi_rspi', 'ppe_ppelc') and r.code in ('supply_officer', 'financial_analyst'))
  )
on conflict (role_code, form_key) do update set can_access = excluded.can_access;

create table if not exists public.role_change_logs (
  id bigint generated always as identity primary key,
  changed_by uuid references auth.users(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  old_roles public.app_role[] not null,
  new_roles public.app_role[] not null,
  created_at timestamptz not null default now()
);

create table if not exists public.form_access_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  form_key text not null,
  action text not null,
  allowed boolean not null,
  created_at timestamptz not null default now()
);

alter table public.roles enable row level security;
alter table public.forms enable row level security;
alter table public.role_form_permissions enable row level security;
alter table public.role_change_logs enable row level security;
alter table public.form_access_logs enable row level security;

create policy roles_read_authenticated on public.roles for select using (auth.uid() is not null);
create policy forms_read_authenticated on public.forms for select using (auth.uid() is not null);
create policy role_form_permissions_read_authenticated on public.role_form_permissions for select using (auth.uid() is not null);
create policy role_change_logs_admin_read on public.role_change_logs for select using (public.has_role(auth.uid(), 'admin'));
create policy form_access_logs_admin_read on public.form_access_logs for select using (public.has_role(auth.uid(), 'admin'));

create or replace function public.role_access_allowed(_roles public.app_role[], _employment_status text, _form_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from unnest(coalesce(_roles, array[]::public.app_role[])) assigned(role)
    join public.role_form_permissions p on p.role_code = assigned.role
    where p.form_key = _form_key and p.can_access
      and (assigned.role <> 'permanent_employee' or _employment_status = 'Permanent')
  );
$$;

create or replace function public.user_can_access_form(_user_id uuid, _form_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select public.role_access_allowed(
      array(select ur.role from public.user_roles ur where ur.user_id = _user_id),
      profile.employment_status,
      _form_key
    )
    from public.profiles profile where profile.id = _user_id
  ), false);
$$;

create or replace function public.check_and_log_form_access(_form_key text, _action text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_allowed boolean;
begin
  if auth.uid() is null then
    insert into public.form_access_logs(user_id, form_key, action, allowed) values (null, _form_key, _action, false);
    return false;
  end if;
  v_allowed := public.user_can_access_form(auth.uid(), _form_key);
  if _action = 'review' then
    v_allowed := v_allowed and public.has_role(auth.uid(), 'staff');
  end if;
  insert into public.form_access_logs(user_id, form_key, action, allowed)
  values (auth.uid(), _form_key, _action, v_allowed);
  return v_allowed;
end;
$$;

grant execute on function public.user_can_access_form(uuid, text) to authenticated;
grant execute on function public.check_and_log_form_access(text, text) to authenticated;

create or replace function public.user_can_create_ris(_user_id uuid, _property_flow text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.user_can_access_form(_user_id, case _property_flow
    when 'semi-expendable' then 'semi_ris'
    when 'ppe' then 'ppe_ris'
    else 'supplies_ris'
  end);
$$;

create policy ris_forms_create_by_form_role on public.ris_forms for insert
  with check (public.user_can_create_ris(auth.uid(), property_flow));
create policy ris_items_create_by_form_role on public.ris_items for insert
  with check (exists (select 1 from public.ris_forms f where f.id = ris_id and public.user_can_create_ris(auth.uid(), f.property_flow)));
create policy ris_forms_update_by_form_role on public.ris_forms for update
  using (public.user_can_access_form(auth.uid(), case property_flow when 'semi-expendable' then 'semi_ris' when 'ppe' then 'ppe_ris' else 'supplies_ris' end) and public.has_role(auth.uid(), 'staff'))
  with check (public.user_can_access_form(auth.uid(), case property_flow when 'semi-expendable' then 'semi_ris' when 'ppe' then 'ppe_ris' else 'supplies_ris' end) and public.has_role(auth.uid(), 'staff'));
create policy transactions_ris_create_by_form_role on public.transactions for insert
  with check (source_form_type <> 'RIS' or exists (
    select 1 from public.ris_forms f where f.id = source_form_id and public.user_can_create_ris(auth.uid(), f.property_flow)
  ));

create policy ppe_documents_matrix_insert on public.ppe_documents for insert
  with check (
    (document_type = 'splc' and public.user_can_access_form(auth.uid(), 'semi_splc'))
    or (document_type = 'ppe-ledger' and public.user_can_access_form(auth.uid(), 'ppe_ppelc'))
  );
create policy ppe_documents_matrix_update on public.ppe_documents for update
  using (
    (document_type = 'splc' and public.user_can_access_form(auth.uid(), 'semi_splc'))
    or (document_type = 'ppe-ledger' and public.user_can_access_form(auth.uid(), 'ppe_ppelc'))
  )
  with check (
    (document_type = 'splc' and public.user_can_access_form(auth.uid(), 'semi_splc'))
    or (document_type = 'ppe-ledger' and public.user_can_access_form(auth.uid(), 'ppe_ppelc'))
  );

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = _user_id and (
      ur.role = _role
      or ur.role = 'admin'
      or (_role in ('staff', 'custodian', 'approver') and ur.role in ('supply_officer', 'inspection_officer'))
      or (_role = 'accounting' and ur.role = 'financial_analyst')
      or (_role = 'viewer' and ur.role in ('regular_user', 'permanent_employee', 'supply_officer', 'inspection_officer', 'financial_analyst'))
    )
  );
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, employment_status)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email, 'Casual')
  on conflict (id) do update set full_name = excluded.full_name, email = excluded.email;
  insert into public.user_roles (user_id, role) values (new.id, 'regular_user') on conflict do nothing;
  return new;
end;
$$;

create or replace function public.admin_replace_user_roles(
  _changed_by uuid,
  _user_id uuid,
  _roles public.app_role[],
  _employment_status text
)
returns void language plpgsql security definer set search_path = public as $$
declare v_old_roles public.app_role[];
begin
  if not public.has_role(_changed_by, 'admin') then raise exception 'Administrator access required'; end if;
  if coalesce(array_length(_roles, 1), 0) < 1 then raise exception 'At least one role is required'; end if;
  if exists (select 1 from unnest(_roles) as assigned(role) where role not in ('admin','regular_user','permanent_employee','supply_officer','inspection_officer','financial_analyst')) then
    raise exception 'Invalid role assignment';
  end if;
  if _employment_status not in ('Permanent','Casual','Contractual','Job Order') then raise exception 'Invalid employment status'; end if;
  select coalesce(array_agg(role order by role), array[]::public.app_role[]) into v_old_roles
  from public.user_roles where user_id = _user_id;
  update public.profiles set employment_status = _employment_status where id = _user_id;
  if not found then raise exception 'User profile not found'; end if;
  delete from public.user_roles where user_id = _user_id;
  insert into public.user_roles(user_id, role)
  select _user_id, assigned_role from (select distinct unnest(_roles) assigned_role) assigned;
  insert into public.role_change_logs(changed_by,user_id,old_roles,new_roles)
  values (_changed_by,_user_id,v_old_roles,array(select distinct unnest(_roles)));
end;
$$;
grant execute on function public.admin_replace_user_roles(uuid, uuid, public.app_role[], text) to authenticated, service_role;
