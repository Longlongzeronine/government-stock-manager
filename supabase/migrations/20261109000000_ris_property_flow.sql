alter table public.ris_forms
  add column if not exists property_flow text not null default 'supplies';

-- Label existing RIS records from their issued item classifications so
-- historical semi-expendable issues remain available to the ICS picker.
update public.ris_forms r
set property_flow = 'semi-expendable'
where exists (
  select 1
  from public.ris_items ri
  join public.items i on i.id = ri.item_id
  where ri.ris_id = r.id
    and i.inventory_classification = 'semi_expendable_property'
);

alter table public.ris_forms
  drop constraint if exists ris_forms_property_flow_check;

alter table public.ris_forms
  add constraint ris_forms_property_flow_check
  check (property_flow in ('supplies', 'semi-expendable', 'ppe'));
