-- Applied live 2026-09-17 via Supabase MCP. Captured here so the repo matches
-- the deployed schema instead of drifting further.

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  actor_email text,
  action text not null,
  target_table text,
  target_id text,
  detail jsonb,
  source text not null default 'db'
);

alter table public.audit_log enable row level security;
revoke insert, update, delete on public.audit_log from anon, authenticated;
revoke select on public.audit_log from anon, authenticated;

create or replace function public.log_audit_event(
  p_action text,
  p_target_table text default null,
  p_target_id text default null,
  p_detail jsonb default null
) returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $$
begin
  insert into public.audit_log (actor_id, action, target_table, target_id, detail)
  values (auth.uid(), p_action, p_target_table, p_target_id, p_detail);
end;
$$;

revoke execute on function public.log_audit_event(text, text, text, jsonb) from anon, authenticated;

-- Close the hardcoded-password bypass on the admin-access queue: this RPC
-- previously trusted a caller-supplied p_orbit_password. It now requires a
-- real admin role via has_role(auth.uid(), 'admin'), and every call (allowed
-- or denied) is written to audit_log.
--
-- IMPORTANT: no account currently holds the 'admin' role on this project, so
-- until you create your own Supabase Auth user here and grant it via
--   insert into public.user_roles (user_id, role) values ('<your-user-id>', 'admin');
-- this queue is unreachable by anyone — including you. That's intentional:
-- the alternative was leaving the anonymous, password-guessable read open.
CREATE OR REPLACE FUNCTION public.list_admin_access_queue(p_orbit_password text)
 RETURNS TABLE(id uuid, email text, identity text, app text, status text, requested_at timestamp with time zone, decided_at timestamp with time zone, decided_by text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.has_role(auth.uid(), 'admin') then
    perform public.log_audit_event('admin_queue.list.denied', 'admin_access_requests', null, null);
    raise exception 'admin sign-in required';
  end if;
  perform public.log_audit_event('admin_queue.list', 'admin_access_requests', null, null);
  return query
    select r.id, r.email, r.identity, r.app, r.status, r.requested_at, r.decided_at, r.decided_by
    from public.admin_access_requests r
    where r.app = 'myafriartx'
    order by r.requested_at desc
    limit 300;
end;
$function$;

-- list_artwork_submissions_queue has the same fix already applied live;
-- see SUPABASE_AUDIT_REPORT.md in AdSpotX-COMPLETE for its exact body.
