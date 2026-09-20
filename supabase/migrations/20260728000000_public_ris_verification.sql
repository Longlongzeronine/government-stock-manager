create table if not exists public.ris_public_verifications (
  id uuid primary key default gen_random_uuid(),
  verification_token text not null unique,
  verification_code text not null unique,
  ris_no text not null,
  status text not null check (status in ('approved', 'issued', 'received', 'cancelled', 'superseded')),
  office text,
  purpose text,
  approved_by text,
  issued_by text,
  approved_date date,
  issued_date date,
  item_count integer not null default 0,
  items jsonb not null default '[]'::jsonb,
  document_version integer not null default 1,
  published_by uuid not null default auth.uid() references auth.users(id),
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ris_public_verifications enable row level security;

create policy ris_verification_publish_authenticated
  on public.ris_public_verifications for insert
  to authenticated
  with check (published_by = auth.uid());

create policy ris_verification_update_authenticated
  on public.ris_public_verifications for update
  to authenticated
  using (published_by = auth.uid())
  with check (published_by = auth.uid());

create or replace function public.verify_ris(p_token text)
returns table (
  verification_code text,
  ris_no text,
  status text,
  office text,
  purpose text,
  approved_by text,
  issued_by text,
  approved_date date,
  issued_date date,
  item_count integer,
  items jsonb,
  document_version integer,
  published_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    v.verification_code, v.ris_no, v.status, v.office, v.purpose,
    v.approved_by, v.issued_by, v.approved_date, v.issued_date,
    v.item_count, v.items, v.document_version, v.published_at, v.updated_at
  from public.ris_public_verifications v
  where v.verification_token = p_token
  limit 1;
$$;

revoke all on table public.ris_public_verifications from anon;
revoke all on function public.verify_ris(text) from public;
grant execute on function public.verify_ris(text) to anon, authenticated;
