-- Reads for the operational data the deployed site renders.
-- Server functions query Supabase REST with the publishable (anon) key, so
-- read access must be granted to the `anon` role as well — a policy with
-- `USING (auth.uid() IS NOT NULL)` alone still evaluates to false for those
-- calls and every inventory query returns zero rows (the "still empty" bug).
-- Writes stay locked behind authenticated user roles. Idempotent: safe to
-- re-run. Run this file in the Supabase dashboard -> SQL Editor.

drop policy if exists items_read_signed_in on public.items;
drop policy if exists items_read_all_authenticated on public.items;
create policy items_read_all on public.items
for select to anon, authenticated using (true);

drop policy if exists categories_read_signed_in on public.categories;
drop policy if exists categories_read_all_authenticated on public.categories;
create policy categories_read_all on public.categories
for select to anon, authenticated using (true);

drop policy if exists suppliers_read_signed_in on public.suppliers;
drop policy if exists suppliers_read_all_authenticated on public.suppliers;
create policy suppliers_read_all on public.suppliers
for select to anon, authenticated using (true);

drop policy if exists transactions_read_signed_in on public.transactions;
drop policy if exists transactions_read_all_authenticated on public.transactions;
create policy transactions_read_all on public.transactions
for select to anon, authenticated using (true);

drop policy if exists iar_forms_read_signed_in on public.iar_forms;
create policy iar_forms_read_all on public.iar_forms
for select to anon, authenticated using (true);

drop policy if exists iar_items_read_signed_in on public.iar_items;
create policy iar_items_read_all on public.iar_items
for select to anon, authenticated using (true);

drop policy if exists ris_forms_read_signed_in on public.ris_forms;
create policy ris_forms_read_all on public.ris_forms
for select to anon, authenticated using (true);

drop policy if exists ris_items_read_signed_in on public.ris_items;
create policy ris_items_read_all on public.ris_items
for select to anon, authenticated using (true);

drop policy if exists ics_forms_read_signed_in on public.ics_forms;
create policy ics_forms_read_all on public.ics_forms
for select to anon, authenticated using (true);

drop policy if exists ics_items_read_signed_in on public.ics_items;
create policy ics_items_read_all on public.ics_items
for select to anon, authenticated using (true);

drop policy if exists par_forms_read_signed_in on public.par_forms;
create policy par_forms_read_all on public.par_forms
for select to anon, authenticated using (true);

drop policy if exists par_items_read_signed_in on public.par_items;
create policy par_items_read_all on public.par_items
for select to anon, authenticated using (true);
