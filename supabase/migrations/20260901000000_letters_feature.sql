-- Letter Studio: shared letterhead + outbound letter log (admin-gated).

-- Letterhead lives in app_settings under a single key so the whole team shares
-- one letterhead (not a per-browser copy). Reuses existing app_settings RLS:
-- readable by authenticated users, writable only by admins.
insert into public.app_settings (key, value)
values ('letterhead', jsonb_build_object(
  'address', 'Plot 12, Creative Quarter,' || chr(10) || 'Abuja, FCT, Nigeria',
  'email',   'partnerships@zonicme.com',
  'url',     'myafriartx.netlify.app',
  'signatory', 'Olufemi Adeagbo',
  'signatoryTitle', 'Founder & Director',
  'logoUrl', null,
  'seal', true
))
on conflict (key) do nothing;

-- Audit log of letters actually sent (consent trail + deliverability record).
create table if not exists public.letters_sent (
  id uuid primary key default gen_random_uuid(),
  sent_by uuid not null references auth.users(id),
  audience text not null check (audience in ('permission','collaboration','advertising')),
  recipient_brand text not null,
  recipient_email text not null,
  subject text not null,
  provider_id text,
  status text not null default 'sent' check (status in ('sent','failed')),
  created_at timestamptz not null default now()
);
alter table public.letters_sent enable row level security;
create policy letters_sent_admin_all on public.letters_sent for all to authenticated
  using (has_role(auth.uid(),'admin'))
  with check (has_role(auth.uid(),'admin'));
