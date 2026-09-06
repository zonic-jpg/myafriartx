-- Soft-session owner (orbit password, no JWT) must still read the shared
-- approval queues when /api/admin-bridge is missing. Password is required —
-- email alone is never enough.

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
  if lower(trim(coalesce(p_orbit_password, ''))) <> 'zonicgate2026' then
    raise exception 'admin sign-in required';
  end if;
  return query
    select
      r.id,
      r.email,
      r.identity,
      r.app,
      r.status,
      r.requested_at,
      r.decided_at,
      r.decided_by
    from public.admin_access_requests r
    where r.app = 'myafriartx'
    order by r.requested_at desc
    limit 300;
end;
$$;

revoke all on function public.list_admin_access_queue(text) from public;
grant execute on function public.list_admin_access_queue(text) to anon, authenticated;

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
  if lower(trim(coalesce(p_orbit_password, ''))) <> 'zonicgate2026' then
    raise exception 'admin sign-in required';
  end if;
  if p_status is null or p_status = 'all' then
    return query
      select s.*
      from public.artwork_submissions s
      order by s.created_at desc
      limit 200;
  else
    return query
      select s.*
      from public.artwork_submissions s
      where s.status = p_status
      order by s.created_at desc
      limit 200;
  end if;
end;
$$;

revoke all on function public.list_artwork_submissions_queue(text, text) from public;
grant execute on function public.list_artwork_submissions_queue(text, text) to anon, authenticated;

insert into public.admin_access_requests (email, identity, app, status)
select 'tester-verify@example.com', 'tester-verify', 'myafriartx', 'pending'
where not exists (
  select 1
  from public.admin_access_requests
  where lower(email) = 'tester-verify@example.com'
    and app = 'myafriartx'
);

update public.admin_access_requests
set status = 'pending',
    identity = 'tester-verify',
    decided_at = null,
    decided_by = null
where lower(email) = 'tester-verify@example.com'
  and app = 'myafriartx';
