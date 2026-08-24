
-- enums
create type public.listing_type as enum ('sell','buy');
create type public.listing_status as enum ('open','closed');
create type public.broker_status as enum ('requested','accepted','rejected','verified','in_transit','delivered','certified','closed');

-- listings
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null,
  type public.listing_type not null,
  title text not null,
  medium text,
  price numeric,
  currency text not null default 'USD',
  notes text,
  image_url text,
  status public.listing_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index listings_member_idx on public.listings(member_id);
create index listings_status_idx on public.listings(status);
alter table public.listings enable row level security;

create policy listings_read_auth on public.listings for select to authenticated
  using (status = 'open' or member_id = auth.uid() or has_role(auth.uid(),'admin'));
create policy listings_insert_self on public.listings for insert to authenticated
  with check (member_id = auth.uid());
create policy listings_update_own on public.listings for update to authenticated
  using (member_id = auth.uid() or has_role(auth.uid(),'admin'))
  with check (member_id = auth.uid() or has_role(auth.uid(),'admin'));
create policy listings_delete_admin on public.listings for delete to authenticated
  using (has_role(auth.uid(),'admin'));

create trigger listings_set_updated_at before update on public.listings
  for each row execute function public.set_updated_at();

-- threads
create table public.threads (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null,
  seller_id uuid not null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id, seller_id)
);
create index threads_buyer_idx on public.threads(buyer_id);
create index threads_seller_idx on public.threads(seller_id);
alter table public.threads enable row level security;

create policy threads_read_participant on public.threads for select to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid() or has_role(auth.uid(),'admin'));
create policy threads_insert_participant on public.threads for insert to authenticated
  with check (buyer_id = auth.uid() or seller_id = auth.uid());
create policy threads_update_admin on public.threads for update to authenticated
  using (has_role(auth.uid(),'admin'));

-- messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  sender_id uuid not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index messages_thread_idx on public.messages(thread_id, created_at);
alter table public.messages enable row level security;

create policy messages_read_participant on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.threads t
      where t.id = thread_id
        and (t.buyer_id = auth.uid() or t.seller_id = auth.uid() or has_role(auth.uid(),'admin'))
    )
  );
create policy messages_insert_participant on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid() and exists (
      select 1 from public.threads t
      where t.id = thread_id
        and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
    )
  );

-- bump thread last_message_at on insert
create or replace function public.bump_thread_last_message()
returns trigger language plpgsql set search_path=public as $$
begin
  update public.threads set last_message_at = now() where id = new.thread_id;
  return new;
end $$;
create trigger messages_bump_thread after insert on public.messages
  for each row execute function public.bump_thread_last_message();

-- broker_requests
create table public.broker_requests (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  requester_id uuid not null,
  status public.broker_status not null default 'requested',
  fee_percent numeric,
  transaction_amount numeric,
  fee_amount numeric,
  currency text not null default 'USD',
  verifier_name text,
  verification_notes text,
  carrier text,
  tracking_ref text,
  delivered_at timestamptz,
  delivery_notes text,
  certificate_url text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index broker_requests_thread_idx on public.broker_requests(thread_id);
create index broker_requests_status_idx on public.broker_requests(status);
alter table public.broker_requests enable row level security;

create policy broker_read_participant on public.broker_requests for select to authenticated
  using (
    has_role(auth.uid(),'admin') or exists (
      select 1 from public.threads t
      where t.id = thread_id and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
    )
  );
create policy broker_insert_participant on public.broker_requests for insert to authenticated
  with check (
    requester_id = auth.uid() and exists (
      select 1 from public.threads t
      where t.id = thread_id and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
    )
  );
create policy broker_update_admin on public.broker_requests for update to authenticated
  using (has_role(auth.uid(),'admin'))
  with check (has_role(auth.uid(),'admin'));

create trigger broker_set_updated_at before update on public.broker_requests
  for each row execute function public.set_updated_at();

-- app_settings (single-row k/v)
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
create policy settings_read_auth on public.app_settings for select to authenticated using (true);
create policy settings_read_anon on public.app_settings for select to anon using (key = 'broker_fee_percent');
create policy settings_write_admin on public.app_settings for all to authenticated
  using (has_role(auth.uid(),'admin'))
  with check (has_role(auth.uid(),'admin'));

insert into public.app_settings(key, value) values ('broker_fee_percent', '5'::jsonb)
  on conflict (key) do nothing;

-- realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.broker_requests;
alter publication supabase_realtime add table public.threads;
