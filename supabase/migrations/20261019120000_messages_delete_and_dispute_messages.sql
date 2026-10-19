alter table public.messages add column if not exists deleted_at timestamptz;
create or replace function public.delete_own_message(p_message_id uuid) returns boolean
language sql security definer set search_path to 'public' as $$
  with u as (update public.messages set deleted_at = now(), body = ''
             where id = p_message_id and sender_id = auth.uid() and deleted_at is null returning 1)
  select exists (select 1 from u);
$$;
revoke execute on function public.delete_own_message(uuid) from public, anon;
grant execute on function public.delete_own_message(uuid) to authenticated;
create table if not exists public.dispute_messages (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.payment_disputes(id) on delete cascade,
  sender_id uuid not null,
  sender_role text not null check (sender_role in ('member','admin')),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists dispute_messages_dispute_idx on public.dispute_messages(dispute_id, created_at);
alter table public.dispute_messages enable row level security;
revoke all on public.dispute_messages from anon, authenticated;
