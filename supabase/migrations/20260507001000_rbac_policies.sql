do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('viewer', 'staff', 'admin');
  end if;
end $$;

alter table public.user_roles
  alter column role type public.app_role using role::public.app_role;

alter table public.user_roles
  alter column role set not null;

alter table public.user_roles
  add constraint user_roles_allowed_role check (role in ('viewer', 'staff', 'admin')) not valid;

create unique index if not exists user_roles_user_id_role_key
  on public.user_roles (user_id, role);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  );
$$;

create or replace function public.can_write_inventory(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(_user_id, 'admin') or public.has_role(_user_id, 'staff');
$$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.items enable row level security;
alter table public.categories enable row level security;
alter table public.suppliers enable row level security;
alter table public.transactions enable row level security;
alter table public.audit_logs enable row level security;

do $$
declare
  policy record;
begin
  for policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles',
        'user_roles',
        'items',
        'categories',
        'suppliers',
        'transactions',
        'audit_logs'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy.policyname,
      policy.schemaname,
      policy.tablename
    );
  end loop;
end $$;

drop policy if exists profiles_read_own_or_admin on public.profiles;
create policy profiles_read_own_or_admin on public.profiles
for select using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists user_roles_read_own_or_admin on public.user_roles;
create policy user_roles_read_own_or_admin on public.user_roles
for select using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists user_roles_admin_all on public.user_roles;
create policy user_roles_admin_all on public.user_roles
for all using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin') and role in ('viewer', 'staff', 'admin'));

drop policy if exists items_read_all_authenticated on public.items;
create policy items_read_all_authenticated on public.items
for select using (auth.uid() is not null);

drop policy if exists items_admin_write on public.items;
create policy items_admin_write on public.items
for all using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists categories_read_all_authenticated on public.categories;
create policy categories_read_all_authenticated on public.categories
for select using (auth.uid() is not null);

drop policy if exists categories_admin_write on public.categories;
create policy categories_admin_write on public.categories
for all using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists suppliers_read_all_authenticated on public.suppliers;
create policy suppliers_read_all_authenticated on public.suppliers
for select using (auth.uid() is not null);

drop policy if exists suppliers_staff_admin_insert on public.suppliers;
create policy suppliers_staff_admin_insert on public.suppliers
for insert with check (public.can_write_inventory(auth.uid()));

drop policy if exists suppliers_staff_admin_update on public.suppliers;
create policy suppliers_staff_admin_update on public.suppliers
for update using (public.can_write_inventory(auth.uid()))
with check (public.can_write_inventory(auth.uid()));

drop policy if exists suppliers_admin_delete on public.suppliers;
create policy suppliers_admin_delete on public.suppliers
for delete using (public.has_role(auth.uid(), 'admin'));

drop policy if exists transactions_read_all_authenticated on public.transactions;
create policy transactions_read_all_authenticated on public.transactions
for select using (auth.uid() is not null);

drop policy if exists transactions_staff_admin_insert on public.transactions;
create policy transactions_staff_admin_insert on public.transactions
for insert with check (public.can_write_inventory(auth.uid()));

drop policy if exists transactions_admin_delete_update on public.transactions;
create policy transactions_admin_delete_update on public.transactions
for all using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists audit_logs_admin_read on public.audit_logs;
create policy audit_logs_admin_read on public.audit_logs
for select using (public.has_role(auth.uid(), 'admin'));

create or replace function public.apply_stock_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.type = 'IN' then
    update public.items
    set quantity = quantity + new.quantity,
        updated_at = now()
    where id = new.item_id;
  elsif new.type = 'OUT' then
    update public.items
    set quantity = greatest(quantity - new.quantity, 0),
        updated_at = now()
    where id = new.item_id;
  end if;

  return new;
end;
$$;

drop trigger if exists apply_stock_transaction_after_insert on public.transactions;

create trigger apply_stock_transaction_after_insert
after insert on public.transactions
for each row execute function public.apply_stock_transaction();
