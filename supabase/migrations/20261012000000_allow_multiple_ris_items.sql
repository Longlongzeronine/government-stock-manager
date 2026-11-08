-- RIS number belongs to one request header. Child lines may repeat products.
-- Preserve the ris_forms.ris_no uniqueness rule while removing any legacy
-- uniqueness that would limit a RIS to one line or one row per item.
do $$
declare
  constraint_row record;
  index_row record;
begin
  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'public.ris_items'::regclass
      and contype = 'u'
      and (
        select array_agg(a.attname::text order by a.attname::text)
        from unnest(conkey) as key(attnum)
        join pg_attribute a on a.attrelid = conrelid and a.attnum = key.attnum
      ) in (array['ris_id']::text[], array['item_id', 'ris_id']::text[])
  loop
    execute format('alter table public.ris_items drop constraint %I', constraint_row.conname);
  end loop;

  for index_row in
    select i.indexrelid::regclass as index_name
    from pg_index i
    where i.indrelid = 'public.ris_items'::regclass
      and i.indisunique
      and not i.indisprimary
      and not exists (select 1 from pg_constraint c where c.conindid = i.indexrelid)
      and (
        select array_agg(a.attname::text order by a.attname::text)
        from unnest(i.indkey) with ordinality as key(attnum, position)
        join pg_attribute a on a.attrelid = i.indrelid and a.attnum = key.attnum
        where key.position <= i.indnkeyatts
      ) in (array['ris_id']::text[], array['item_id', 'ris_id']::text[])
  loop
    execute format('drop index %s', index_row.index_name);
  end loop;

  if not exists (
    select 1
    from pg_index i
    join pg_attribute a on a.attrelid = i.indrelid and a.attname = 'ris_no'
    where i.indrelid = 'public.ris_forms'::regclass
      and i.indisunique
      and i.indnkeyatts = 1
      and a.attnum = any(i.indkey)
  ) then
    create unique index ris_forms_ris_no_unique_idx on public.ris_forms (ris_no);
  end if;
end
$$;

notify pgrst, 'reload schema';
