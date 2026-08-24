-- KYC verification workflow + dispute resolution — closes launch-gating gaps

-- ── Private KYC document bucket ──────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('kyc', 'kyc', false)
on conflict (id) do nothing;

-- Members may upload only into their own folder; nobody reads via anon/auth
-- (documents are served to admins through short-lived signed URLs created
-- with the service role, never through public storage policies).
create policy "kyc_upload_own_folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'kyc' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "kyc_no_direct_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'kyc'
    and exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
  );

-- ── Extend member_verifications for a real submission workflow ───────────────
alter table member_verifications add column if not exists full_name text;
alter table member_verifications add column if not exists document_path text;
alter table member_verifications add column if not exists submitted_at timestamptz;
alter table member_verifications add column if not exists rejected_reason text;

-- Members submit / resubmit their own record (server functions run with the
-- service role, but a defence-in-depth policy keeps direct access honest):
create policy "own verification submit" on member_verifications
  for insert with check (auth.uid() = user_id);
create policy "own verification resubmit" on member_verifications
  for update using (auth.uid() = user_id and status in ('unverified', 'rejected', 'pending'))
  with check (auth.uid() = user_id and status = 'pending');

-- Status vocabulary guard
alter table member_verifications drop constraint if exists member_verifications_status_chk;
alter table member_verifications add constraint member_verifications_status_chk
  check (status in ('unverified', 'pending', 'verified', 'rejected'));

create index if not exists idx_member_verifications_status
  on member_verifications(status) where status = 'pending';

-- Single source of truth for "is this member verified?"
create or replace function is_member_verified(p_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from member_verifications
    where user_id = p_user_id and status = 'verified'
  );
$$;

-- ── Disputes: admin management + resolution RPC ──────────────────────────────
alter table payment_disputes add column if not exists escrow_hold_id uuid references escrow_holds(id) on delete set null;
alter table payment_disputes add column if not exists updated_at timestamptz not null default now();

create policy "admin manage disputes" on payment_disputes
  for update using (exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin'));

create index if not exists idx_payment_disputes_open
  on payment_disputes(status, created_at desc) where status = 'open';

-- One open dispute per payment: prevents queue-spamming
create unique index if not exists uq_payment_disputes_open_payment
  on payment_disputes(payment_id) where status = 'open';

-- Atomic resolution: close the dispute and, when instructed, refund the
-- escrow hold + mark the payment refunded in the same transaction.
create or replace function resolve_payment_dispute(
  p_dispute_id uuid,
  p_resolution text,
  p_outcome text,          -- 'resolved' | 'rejected'
  p_refund_escrow boolean,
  p_admin_id uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  d payment_disputes%rowtype;
begin
  select * into d from payment_disputes where id = p_dispute_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if d.status <> 'open' then return jsonb_build_object('ok', false, 'error', 'already_closed'); end if;
  if p_outcome not in ('resolved', 'rejected') then
    return jsonb_build_object('ok', false, 'error', 'bad_outcome');
  end if;

  update payment_disputes set
    status = p_outcome,
    resolution = p_resolution,
    resolved_by = p_admin_id,
    resolved_at = now(),
    updated_at = now()
  where id = p_dispute_id;

  if p_refund_escrow then
    update escrow_holds set
      status = 'refunded',
      release_reason = 'dispute_' || p_dispute_id::text,
      released_at = now()
    where payment_id = d.payment_id and status = 'held';

    update payments set status = 'refunded', updated_at = now()
    where id = d.payment_id and status = 'succeeded';
  end if;

  return jsonb_build_object('ok', true);
end; $$;

-- ── KYC enforcement threshold for escrow (₦, admin-tunable) ──────────────────
insert into app_settings (key, value)
values ('kyc_required_escrow_ngn', '500000'::jsonb)
on conflict (key) do nothing;
