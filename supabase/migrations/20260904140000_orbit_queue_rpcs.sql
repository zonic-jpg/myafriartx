-- Historical migration, sanitised. This originally created two RPCs that
-- trusted a caller-supplied shared "orbit" password. That path was closed in
-- 20260918000000 (admin role required) and the RPCs are dropped entirely in
-- 20261004120000_signup_approvals.sql. The bodies below match what was
-- deployed after the 20260918 fix, so a from-scratch replay never contains a
-- password check. No password is stored or compared anywhere in this repo.

create or replace function public.list_admin_access_queue(p_orbit_password text)
returns table (
  id uuid,
  email text,
  identity text,
  app text,
  status text,
  requested_at timestamptz,
  decided_at timestamptz,
  decided_by text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'admin sign-in required';
  end if;
  return query
    select r.id, r.email, r.identity, r.app, r.status, r.requested_at, r.decided_at, r.decided_by
    from public.admin_access_requests r
    where r.app = 'myafriartx'
    order by r.requested_at desc
    limit 300;
end;
$$;

revoke all on function public.list_admin_access_queue(text) from public;
grant execute on function public.list_admin_access_queue(text) to authenticated;

create or replace function public.list_artwork_submissions_queue(
  p_orbit_password text,
  p_status text default 'pending'
)
returns setof public.artwork_submissions
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'admin sign-in required';
  end if;
  if p_status is null or p_status = 'all' then
    return query select s.* from public.artwork_submissions s order by s.created_at desc limit 200;
  else
    return query select s.* from public.artwork_submissions s where s.status = p_status order by s.created_at desc limit 200;
  end if;
end;
$$;

revoke all on function public.list_artwork_submissions_queue(text, text) from public;
grant execute on function public.list_artwork_submissions_queue(text, text) to authenticated;
