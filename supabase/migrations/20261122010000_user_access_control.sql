-- Explicit per-user access control. Roles remain useful for workflow and form
-- rules, but page/action authorization is decided by user_access.

create table if not exists public.permission_catalog (
  module_key text not null,
  action_key text not null,
  sort_order integer not null default 0,
  primary key (module_key, action_key)
);

with catalog(module_key, actions, module_order) as (
  values
    ('dashboard', '["view"]'::jsonb, 10),
    ('inventory', '["view","create","update","import","delete"]'::jsonb, 20),
    ('scanner', '["view"]'::jsonb, 30),
    ('ris_history', '["view"]'::jsonb, 40),
    ('forms', '["view","create","update","approve","export"]'::jsonb, 50),
    ('requisitions', '["view","create","update","delete"]'::jsonb, 60),
    ('stock', '["view","create","update","delete"]'::jsonb, 70),
    ('categories', '["view","create","update","delete"]'::jsonb, 80),
    ('suppliers', '["view","create","update","delete"]'::jsonb, 90),
    ('assistant', '["view","use"]'::jsonb, 100),
    ('approvals', '["view","review","recommend","approve","release","reject"]'::jsonb, 110),
    ('user_access', '["manage"]'::jsonb, 120),
    ('audit_logs', '["view"]'::jsonb, 130),
    ('dev_space', '["view"]'::jsonb, 140),
    ('migrations', '["view","run"]'::jsonb, 150)
)
insert into public.permission_catalog(module_key, action_key, sort_order)
select module_key, action, module_order * 100 + action_order
from catalog
cross join lateral jsonb_array_elements_text(actions) with ordinality action_rows(action, action_order)
on conflict (module_key, action_key) do update set sort_order = excluded.sort_order;

delete from public.permission_catalog
where module_key not in (
  'dashboard', 'inventory', 'scanner', 'ris_history', 'forms',
  'requisitions', 'stock', 'categories', 'suppliers', 'assistant',
  'approvals', 'user_access', 'audit_logs', 'dev_space', 'migrations'
);

create table if not exists public.user_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access jsonb not null default '{}'::jsonb check (jsonb_typeof(access) = 'object'),
  assigned_by_user_id uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_access_audit_logs (
  id bigint generated always as identity primary key,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  previous_access jsonb,
  new_access jsonb not null,
  administrator_user_id uuid references auth.users(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists user_access_audit_target_created_idx
  on public.user_access_audit_logs(target_user_id, created_at desc);

create or replace function public.normalize_user_access(_access jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb := '{}'::jsonb;
  v_module record;
  v_actions jsonb;
begin
  if _access is null or jsonb_typeof(_access) <> 'object' then
    return '{}'::jsonb;
  end if;

  for v_module in
    select module_key, min(sort_order) module_order
    from public.permission_catalog
    group by module_key
    order by min(sort_order)
  loop
    if _access ? v_module.module_key and jsonb_typeof(_access -> v_module.module_key) = 'array' then
      select coalesce(jsonb_agg(c.action_key order by c.sort_order), '[]'::jsonb)
      into v_actions
      from public.permission_catalog c
      where c.module_key = v_module.module_key
        and (_access -> v_module.module_key) ? c.action_key;

      if jsonb_array_length(v_actions) > 0
         and exists (select 1 from public.permission_catalog c where c.module_key = v_module.module_key and c.action_key = 'view')
         and not (v_actions ? 'view') then
        v_actions := '["view"]'::jsonb || v_actions;
      end if;

      v_result := v_result || jsonb_build_object(v_module.module_key, v_actions);
    end if;
  end loop;
  if v_result ? 'migrations' and jsonb_array_length(v_result -> 'migrations') > 0 then
    v_result := v_result || '{"dev_space":["view"]}'::jsonb;
  end if;
  return v_result;
end;
$$;

create or replace function public.user_can_access(_user_id uuid, _module text, _action text default 'view')
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when _user_id is null then false
    when exists (select 1 from public.user_access ua where ua.user_id = _user_id)
      then coalesce((select (ua.access -> _module) ? _action from public.user_access ua where ua.user_id = _user_id), false)
    else _module = 'dashboard' and _action = 'view'
  end;
$$;

create or replace function public.user_can_access_any(_user_id uuid, _requirements jsonb)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from jsonb_array_elements(_requirements) requirement
    where public.user_can_access(
      _user_id,
      requirement ->> 0,
      coalesce(requirement ->> 1, 'view')
    )
  );
$$;

create or replace function public.get_my_access()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then '{}'::jsonb
    when exists (select 1 from public.user_access ua where ua.user_id = auth.uid())
      then (select ua.access from public.user_access ua where ua.user_id = auth.uid())
    else '{"dashboard":["view"]}'::jsonb
  end;
$$;

create or replace function public.is_access_administrator(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.user_can_access(_user_id, 'user_access', 'manage'); $$;

create or replace function public.admin_save_user_access(
  _target_user_id uuid,
  _access jsonb,
  _reason text default null
)
returns public.user_access
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_previous jsonb;
  v_normalized jsonb;
  v_saved public.user_access;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not public.is_access_administrator(v_actor) then raise exception 'User access administrator permission required' using errcode = '42501'; end if;
  if v_actor = _target_user_id then raise exception 'Administrators cannot change their own access from this screen' using errcode = '42501'; end if;
  if not exists (select 1 from auth.users where id = _target_user_id) then raise exception 'Target user not found'; end if;

  v_normalized := public.normalize_user_access(_access);
  select access into v_previous from public.user_access where user_id = _target_user_id;

  insert into public.user_access(user_id, access, assigned_by_user_id, assigned_at)
  values (_target_user_id, v_normalized, v_actor, now())
  on conflict (user_id) do update set
    access = excluded.access,
    assigned_by_user_id = excluded.assigned_by_user_id,
    assigned_at = excluded.assigned_at,
    updated_at = now()
  returning * into v_saved;

  insert into public.user_access_audit_logs(
    target_user_id, previous_access, new_access, administrator_user_id, reason
  ) values (_target_user_id, v_previous, v_normalized, v_actor, nullif(trim(_reason), ''));
  return v_saved;
end;
$$;

revoke execute on function public.get_my_access() from public, anon;
revoke execute on function public.user_can_access(uuid, text, text) from public, anon;
revoke execute on function public.user_can_access_any(uuid, jsonb) from public, anon;
revoke execute on function public.is_access_administrator(uuid) from public, anon;
revoke execute on function public.admin_save_user_access(uuid, jsonb, text) from public, anon;
grant execute on function public.get_my_access() to authenticated;
grant execute on function public.user_can_access(uuid, text, text) to authenticated, service_role;
grant execute on function public.user_can_access_any(uuid, jsonb) to authenticated, service_role;
grant execute on function public.is_access_administrator(uuid) to authenticated, service_role;
grant execute on function public.admin_save_user_access(uuid, jsonb, text) to authenticated;

-- Make every existing account explicit. This preserves current access during
-- rollout while future accounts without a record receive dashboard-only access.
-- Re-normalizing also removes obsolete permissions if an earlier draft of this
-- migration was already applied to an environment.
update public.user_access
set access = public.normalize_user_access(access), updated_at = now();

with admin_access as (
  select jsonb_object_agg(module_key, actions) access
  from (
    select module_key, jsonb_agg(action_key order by sort_order) actions
    from public.permission_catalog group by module_key
  ) modules
), seeded as (
  select p.id user_id,
    case
      when exists (select 1 from public.user_roles ur where ur.user_id = p.id and ur.role::text in ('admin','super_admin'))
        then (select access from admin_access)
      when exists (select 1 from public.user_roles ur where ur.user_id = p.id and ur.role::text = 'supply_officer')
        then '{"dashboard":["view"],"inventory":["view","create","update","import"],"scanner":["view"],"ris_history":["view"],"forms":["view","create","update","export"],"requisitions":["view","create","update","delete"],"stock":["view","create","update","delete"],"categories":["view","create","update","delete"],"suppliers":["view","create","update","delete"],"assistant":["view","use"],"approvals":["view","review"]}'::jsonb
      when exists (select 1 from public.user_roles ur where ur.user_id = p.id and ur.role::text = 'inspection_officer')
        then '{"dashboard":["view"],"inventory":["view"],"scanner":["view"],"ris_history":["view"],"forms":["view","update","approve","export"],"requisitions":["view"],"stock":["view"],"categories":["view"],"suppliers":["view"],"assistant":["view"],"approvals":["view","review","recommend","approve","reject"]}'::jsonb
      when exists (select 1 from public.user_roles ur where ur.user_id = p.id and ur.role::text = 'financial_analyst')
        then '{"dashboard":["view"],"inventory":["view"],"scanner":["view"],"ris_history":["view"],"forms":["view","export"],"requisitions":["view"],"stock":["view"],"categories":["view"],"suppliers":["view"],"assistant":["view"],"approvals":["view","review"]}'::jsonb
      else '{"dashboard":["view"],"inventory":["view"],"scanner":["view"],"ris_history":["view"],"forms":["view"],"requisitions":["view"],"stock":["view"],"categories":["view"],"suppliers":["view"],"assistant":["view"]}'::jsonb
    end access
  from public.profiles p
)
insert into public.user_access(user_id, access)
select user_id, public.normalize_user_access(access) from seeded
on conflict (user_id) do nothing;

alter table public.permission_catalog enable row level security;
alter table public.user_access enable row level security;
alter table public.user_access_audit_logs enable row level security;

drop policy if exists permission_catalog_read_authenticated on public.permission_catalog;
create policy permission_catalog_read_authenticated on public.permission_catalog
for select using (auth.uid() is not null);

drop policy if exists user_access_read_own_or_manager on public.user_access;
create policy user_access_read_own_or_manager on public.user_access
for select using (user_id = auth.uid() or public.is_access_administrator(auth.uid()));

drop policy if exists user_access_audit_manager_read on public.user_access_audit_logs;
create policy user_access_audit_manager_read on public.user_access_audit_logs
for select using (public.is_access_administrator(auth.uid()));

-- Restrictive policies are combined with the existing role/form policies, so
-- direct REST calls cannot bypass the same page/action decisions.
create policy access_items_select on public.items as restrictive for select
using (public.user_can_access_any(auth.uid(), '[["dashboard","view"],["inventory","view"],["scanner","view"],["forms","view"],["stock","view"],["requisitions","view"],["assistant","view"]]'::jsonb));
create policy access_items_insert on public.items as restrictive for insert
with check (public.user_can_access_any(auth.uid(), '[["inventory","create"],["forms","create"]]'::jsonb));
create policy access_items_update on public.items as restrictive for update
using (public.user_can_access(auth.uid(), 'inventory', 'update')) with check (public.user_can_access(auth.uid(), 'inventory', 'update'));
create policy access_items_delete on public.items as restrictive for delete
using (public.user_can_access(auth.uid(), 'inventory', 'delete'));

create policy access_categories_select on public.categories as restrictive for select
using (public.user_can_access_any(auth.uid(), '[["dashboard","view"],["inventory","view"],["categories","view"],["forms","view"]]'::jsonb));
create policy access_categories_insert on public.categories as restrictive for insert
with check (public.user_can_access_any(auth.uid(), '[["categories","create"],["inventory","create"]]'::jsonb));
create policy access_categories_update on public.categories as restrictive for update
using (public.user_can_access(auth.uid(), 'categories', 'update')) with check (public.user_can_access(auth.uid(), 'categories', 'update'));
create policy access_categories_delete on public.categories as restrictive for delete
using (public.user_can_access(auth.uid(), 'categories', 'delete'));

create policy access_suppliers_select on public.suppliers as restrictive for select
using (public.user_can_access_any(auth.uid(), '[["dashboard","view"],["inventory","view"],["suppliers","view"],["forms","view"]]'::jsonb));
create policy access_suppliers_insert on public.suppliers as restrictive for insert
with check (public.user_can_access(auth.uid(), 'suppliers', 'create'));
create policy access_suppliers_update on public.suppliers as restrictive for update
using (public.user_can_access(auth.uid(), 'suppliers', 'update')) with check (public.user_can_access(auth.uid(), 'suppliers', 'update'));
create policy access_suppliers_delete on public.suppliers as restrictive for delete
using (public.user_can_access(auth.uid(), 'suppliers', 'delete'));

create policy access_transactions_select on public.transactions as restrictive for select
using (public.user_can_access_any(auth.uid(), '[["dashboard","view"],["scanner","view"],["forms","view"],["stock","view"],["assistant","view"]]'::jsonb));
create policy access_transactions_insert on public.transactions as restrictive for insert
with check (public.user_can_access_any(auth.uid(), '[["stock","create"],["forms","create"]]'::jsonb));
create policy access_transactions_update on public.transactions as restrictive for update
using (public.user_can_access(auth.uid(), 'stock', 'update')) with check (public.user_can_access(auth.uid(), 'stock', 'update'));
create policy access_transactions_delete on public.transactions as restrictive for delete
using (public.user_can_access(auth.uid(), 'stock', 'delete'));

create policy access_audit_logs_select on public.audit_logs as restrictive for select
using (public.user_can_access(auth.uid(), 'audit_logs', 'view'));

-- Form/workflow tables use the form matrix and the new page/action matrix.
do $$
declare table_name text;
begin
  foreach table_name in array array['iar_forms','iar_items','ris_forms','ris_items','ics_forms','ics_items','par_forms','par_items','accountability_events','splc_entries','ppe_documents','form_approvals']
  loop
    if to_regclass('public.' || table_name) is not null then
      execute format('create policy %I on public.%I as restrictive for select using (public.user_can_access_any(auth.uid(), ''[["forms","view"],["ris_history","view"],["approvals","view"]]''::jsonb))', 'access_' || table_name || '_select', table_name);
      execute format('create policy %I on public.%I as restrictive for insert with check (public.user_can_access(auth.uid(), ''forms'', ''create''))', 'access_' || table_name || '_insert', table_name);
      execute format('create policy %I on public.%I as restrictive for update using (public.user_can_access_any(auth.uid(), ''[["forms","update"],["approvals","approve"]]''::jsonb)) with check (public.user_can_access_any(auth.uid(), ''[["forms","update"],["approvals","approve"]]''::jsonb))', 'access_' || table_name || '_update', table_name);
      execute format('create policy %I on public.%I as restrictive for delete using (public.user_can_access(auth.uid(), ''forms'', ''update''))', 'access_' || table_name || '_delete', table_name);
    end if;
  end loop;
end $$;

create policy access_profiles_select on public.profiles as restrictive for select
using (id = auth.uid() or public.is_access_administrator(auth.uid()));
create policy access_user_roles_select on public.user_roles as restrictive for select
using (user_id = auth.uid() or public.is_access_administrator(auth.uid()));

notify pgrst, 'reload schema';
