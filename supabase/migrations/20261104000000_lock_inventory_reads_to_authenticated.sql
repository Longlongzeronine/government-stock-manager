-- Inventory server functions use the server-only service role after checking
-- the caller's Supabase session. Keep direct PostgREST reads private to users.
-- Public RIS verification remains available through the verify_ris RPC.

drop policy if exists items_read_all on public.items;
drop policy if exists categories_read_all on public.categories;
drop policy if exists suppliers_read_all on public.suppliers;
drop policy if exists transactions_read_all on public.transactions;
drop policy if exists iar_forms_read_all on public.iar_forms;
drop policy if exists iar_items_read_all on public.iar_items;
drop policy if exists ris_forms_read_all on public.ris_forms;
drop policy if exists ris_items_read_all on public.ris_items;
drop policy if exists ics_forms_read_all on public.ics_forms;
drop policy if exists ics_items_read_all on public.ics_items;
drop policy if exists par_forms_read_all on public.par_forms;
drop policy if exists par_items_read_all on public.par_items;

drop policy if exists items_read_authenticated on public.items;
create policy items_read_authenticated on public.items
for select to authenticated using (auth.uid() is not null);

drop policy if exists categories_read_authenticated on public.categories;
create policy categories_read_authenticated on public.categories
for select to authenticated using (auth.uid() is not null);

drop policy if exists suppliers_read_authenticated on public.suppliers;
create policy suppliers_read_authenticated on public.suppliers
for select to authenticated using (auth.uid() is not null);

drop policy if exists transactions_read_authenticated on public.transactions;
create policy transactions_read_authenticated on public.transactions
for select to authenticated using (auth.uid() is not null);

drop policy if exists iar_forms_read_authenticated on public.iar_forms;
create policy iar_forms_read_authenticated on public.iar_forms
for select to authenticated using (auth.uid() is not null);

drop policy if exists iar_items_read_authenticated on public.iar_items;
create policy iar_items_read_authenticated on public.iar_items
for select to authenticated using (auth.uid() is not null);

drop policy if exists ris_forms_read_authenticated on public.ris_forms;
create policy ris_forms_read_authenticated on public.ris_forms
for select to authenticated using (auth.uid() is not null);

drop policy if exists ris_items_read_authenticated on public.ris_items;
create policy ris_items_read_authenticated on public.ris_items
for select to authenticated using (auth.uid() is not null);

drop policy if exists ics_forms_read_authenticated on public.ics_forms;
create policy ics_forms_read_authenticated on public.ics_forms
for select to authenticated using (auth.uid() is not null);

drop policy if exists ics_items_read_authenticated on public.ics_items;
create policy ics_items_read_authenticated on public.ics_items
for select to authenticated using (auth.uid() is not null);

drop policy if exists par_forms_read_authenticated on public.par_forms;
create policy par_forms_read_authenticated on public.par_forms
for select to authenticated using (auth.uid() is not null);

drop policy if exists par_items_read_authenticated on public.par_items;
create policy par_items_read_authenticated on public.par_items
for select to authenticated using (auth.uid() is not null);
