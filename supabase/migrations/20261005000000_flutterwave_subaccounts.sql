-- Flutterwave subaccount payouts (feature-flagged, off by default).
--
-- Design intent (per Femi, 2026-09-20): MyAfriArt must never hold seller
-- funds or raw bank account details. An admin "vets" an artist's bank
-- account (resolves the account name via Flutterwave before saving), then
-- creates a Flutterwave Subaccount for them. Only the subaccount_id and
-- display-safe fields (bank code, last 4 digits, verified name) are ever
-- stored here — the full account number passed to Flutterwave during
-- creation is never written to this database. All money movement and the
-- actual payout split happen on Flutterwave's platform; this app only
-- references the subaccount id at checkout time.
--
-- Entirely additive and OFF by default via flutterwave_subaccounts_enabled
-- (app_settings) — existing checkout behavior is unchanged until an admin
-- explicitly flips it on, and even then only artworks whose artist has a
-- verified subaccount are affected.

alter table public.artists
  add column if not exists flutterwave_subaccount_id text,
  add column if not exists payout_bank_code text,
  add column if not exists payout_account_last4 text,
  add column if not exists payout_verified_name text,
  add column if not exists payout_updated_at timestamptz;

comment on column public.artists.flutterwave_subaccount_id is
  'Flutterwave subaccount id for automatic split-payment payouts. Null = not yet vetted/onboarded.';
comment on column public.artists.payout_account_last4 is
  'Last 4 digits of the verified bank account, for admin display only — the full number is never stored.';

insert into public.app_settings (key, value)
values ('flutterwave_subaccounts_enabled', 'false'::jsonb)
on conflict (key) do nothing;

notify pgrst, 'reload schema';
