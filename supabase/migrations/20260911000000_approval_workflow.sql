-- Add approval metadata to RIS requests.
alter table public.ris_forms
  add column if not exists status text not null default 'pending',
  add column if not exists priority text not null default 'normal',
  add column if not exists review_notes text;

alter table public.ris_forms
  drop column if exists needed_by;

alter table public.ris_forms
  drop constraint if exists ris_forms_status_check;

alter table public.ris_forms
  add constraint ris_forms_status_check
  check (status in ('pending', 'approved', 'rejected', 'draft', 'issued', 'cancelled'));

create index if not exists idx_ris_forms_status on public.ris_forms(status);
