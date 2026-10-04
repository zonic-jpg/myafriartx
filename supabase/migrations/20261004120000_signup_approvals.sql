-- ═══════════════════════════════════════════════════════════════════════════
-- Super-admin signup approvals + owner notification bookkeeping (MyAfriArt).
-- ---------------------------------------------------------------------------
-- * oadeagbo@gmail.com is the founding owner / super admin, recognised ONLY by
--   a VERIFIED email (auth.users.email_confirmed_at). No password is stored,
--   seeded or compared anywhere. Keep "Confirm email" ON in Supabase Auth.
-- * Default behaviour is unchanged: sign-in is open. The owner can switch
--   "require approvals" on; NEW accounts then wait in signup_approvals as
--   'pending' until the owner approves them and picks a role. Accounts that
--   predate the switch are grandfathered. Switching it off releases everyone.
-- * Testers sign up with their own email; they show up on the owner's approvals
--   page and the owner grants content-management admin with one tap
--   (set_member_role / decide_signup). Only the owner can write user_roles.
-- * The retired shared-password queue RPCs are dropped.
-- All writes go through SECURITY DEFINER functions; the tables have no client
-- write policies. Idempotent; safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Founding owner (verified email only) ────────────────────────────────────
create or replace function public.founding_owner_email() returns text
language sql immutable as $$ select 'oadeagbo@gmail.com'::text $$;
revoke execute on function public.founding_owner_email() from anon, public;
grant execute on function public.founding_owner_email() to authenticated, service_role;

create or replace function public.is_founding_owner(_uid uuid) returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from auth.users u
     where u.id = _uid
       and lower(u.email) = public.founding_owner_email()
       and u.email_confirmed_at is not null
  );
$$;
revoke execute on function public.is_founding_owner(uuid) from anon, public;
grant execute on function public.is_founding_owner(uuid) to authenticated, service_role;

-- The app has no separate super_admin role: the verified founding owner IS the
-- super admin.
create or replace function public.is_owner_or_super() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select auth.uid() is not null and public.is_founding_owner(auth.uid());
$$;
revoke execute on function public.is_owner_or_super() from anon, public;
grant execute on function public.is_owner_or_super() to authenticated;

-- Owner acts as user AND admin: give the verified owner real role rows so every
-- RLS policy / server function that reads user_roles lets them through.
create or replace function public.grant_owner_roles(_uid uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_founding_owner(_uid) then return; end if;
  insert into public.user_roles (user_id, role) values (_uid, 'admin') on conflict do nothing;
  insert into public.user_roles (user_id, role) values (_uid, 'user') on conflict do nothing;
end;
$$;
revoke execute on function public.grant_owner_roles(uuid) from anon, authenticated, public;

create or replace function public.on_auth_user_owner_roles() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  if lower(new.email) = public.founding_owner_email() and new.email_confirmed_at is not null then
    perform public.grant_owner_roles(new.id);
  end if;
  return new;
end;
$$;
revoke execute on function public.on_auth_user_owner_roles() from anon, authenticated, public;

drop trigger if exists on_auth_user_owner_roles on auth.users;
create trigger on_auth_user_owner_roles
  after insert or update of email_confirmed_at, email on auth.users
  for each row execute function public.on_auth_user_owner_roles();

-- ── Tables ──────────────────────────────────────────────────────────────────
-- One-row policy table. Deliberately NOT app_settings: admins can write that
-- table directly, and a granted tester must not be able to flip this switch.
create table if not exists public.signup_policy (
  id boolean primary key default true check (id),
  require_approvals boolean not null default false,
  require_approvals_since timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.signup_policy (id) values (true) on conflict (id) do nothing;
alter table public.signup_policy enable row level security;
revoke all on table public.signup_policy from anon, authenticated, public;

create table if not exists public.signup_approvals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  requested_role text not null default 'user' check (requested_role in ('user','admin')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  granted_role text,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid,
  notified_at timestamptz,
  admin_requested_at timestamptz,
  admin_notified_at timestamptz
);
alter table public.signup_approvals enable row level security;
revoke all on table public.signup_approvals from anon, public;
revoke insert, update, delete on table public.signup_approvals from authenticated;
grant select on table public.signup_approvals to authenticated;
grant all on table public.signup_approvals to service_role;

drop policy if exists "signup_approvals_read" on public.signup_approvals;
create policy "signup_approvals_read" on public.signup_approvals
  for select to authenticated
  using (user_id = auth.uid() or public.is_owner_or_super());

-- Existing accounts are grandfathered: record them as approved so the owner's
-- page lists everyone from day one (and so a later "require approvals" switch
-- never locks them out).
insert into public.signup_approvals (user_id, email, requested_role, status, granted_role, decided_at)
select u.id, lower(coalesce(u.email, '')), 'user', 'approved',
       case when exists (select 1 from public.user_roles r where r.user_id = u.id and r.role = 'admin')
            then 'admin' else 'user' end,
       now()
  from auth.users u
on conflict (user_id) do nothing;

-- Owner row (if the owner already has a confirmed account).
select public.grant_owner_roles(u.id) from auth.users u
 where lower(u.email) = public.founding_owner_email() and u.email_confirmed_at is not null;

-- ── Only the owner may allocate roles ───────────────────────────────────────
-- A tester granted content-management admin must not be able to hand out (or
-- strip) roles, including the owner's. Reads stay as they were.
drop policy if exists "user_roles_admin_insert" on public.user_roles;
drop policy if exists "user_roles_admin_update" on public.user_roles;
drop policy if exists "user_roles_admin_delete" on public.user_roles;
drop policy if exists "user_roles_owner_insert" on public.user_roles;
drop policy if exists "user_roles_owner_update" on public.user_roles;
drop policy if exists "user_roles_owner_delete" on public.user_roles;
create policy "user_roles_owner_insert" on public.user_roles
  for insert to authenticated with check (public.is_owner_or_super());
create policy "user_roles_owner_update" on public.user_roles
  for update to authenticated using (public.is_owner_or_super()) with check (public.is_owner_or_super());
create policy "user_roles_owner_delete" on public.user_roles
  for delete to authenticated using (public.is_owner_or_super());

-- ── RPCs ────────────────────────────────────────────────────────────────────
-- Called by the signed-in client after login. Idempotent: returns the existing
-- decision, or creates the row (approved or pending) on first sight.
create or replace function public.register_signup(_requested_role text default 'user') returns jsonb
language plpgsql security definer set search_path = public, auth as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_role text := lower(trim(coalesce(nullif(_requested_role, ''), 'user')));
  v_req boolean;
  v_since timestamptz;
  v_created timestamptz;
  v_row public.signup_approvals%rowtype;
begin
  if v_uid is null then
    raise exception 'Sign-in required';
  end if;
  if v_role not in ('user','admin') then v_role := 'user'; end if;

  select lower(coalesce(email, '')), created_at into v_email, v_created from auth.users where id = v_uid;

  -- The verified founding owner is never gated, whatever the switch says.
  if public.is_founding_owner(v_uid) then
    perform public.grant_owner_roles(v_uid);
    insert into public.signup_approvals (user_id, email, requested_role, status, granted_role, decided_at)
    values (v_uid, v_email, 'user', 'approved', 'admin', now())
    on conflict (user_id) do update set status = 'approved', granted_role = 'admin';
    return jsonb_build_object('status', 'approved', 'role', 'admin', 'owner', true);
  end if;

  select * into v_row from public.signup_approvals where user_id = v_uid;
  if found then
    return jsonb_build_object('status', v_row.status, 'role', coalesce(v_row.granted_role, v_row.requested_role));
  end if;

  select require_approvals, require_approvals_since into v_req, v_since from public.signup_policy where id;

  if coalesce(v_req, false) = false or (v_since is not null and v_created < v_since) then
    insert into public.signup_approvals (user_id, email, requested_role, status, granted_role, decided_at)
    values (v_uid, v_email, v_role, 'approved', 'user', now())
    on conflict (user_id) do nothing;
    return jsonb_build_object('status', 'approved', 'role', 'user');
  end if;

  insert into public.signup_approvals (user_id, email, requested_role, status)
  values (v_uid, v_email, v_role, 'pending')
  on conflict (user_id) do nothing;
  return jsonb_build_object('status', 'pending', 'role', v_role);
end;
$$;
revoke execute on function public.register_signup(text) from anon, public;
grant execute on function public.register_signup(text) to authenticated;

-- A signed-in non-admin asks the owner for content-management admin (replaces
-- the retired shared-password request flow). Never grants anything itself.
create or replace function public.request_admin_access() returns jsonb
language plpgsql security definer set search_path = public, auth as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sign-in required'; end if;
  if public.has_role(v_uid, 'admin') then
    return jsonb_build_object('status', 'already_admin');
  end if;
  perform public.register_signup('admin');
  update public.signup_approvals
     set admin_requested_at = coalesce(admin_requested_at, now()),
         requested_role = case when status = 'pending' then 'admin' else requested_role end
   where user_id = v_uid;
  return jsonb_build_object('status', 'requested');
end;
$$;
revoke execute on function public.request_admin_access() from anon, public;
grant execute on function public.request_admin_access() to authenticated;

create or replace function public.list_signup_approvals() returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_owner_or_super() then
    raise exception 'Only the owner can view signup approvals';
  end if;
  return jsonb_build_object(
    'require_approvals', coalesce((select require_approvals from public.signup_policy where id), false),
    'pending', coalesce((
      select jsonb_agg(to_jsonb(s) || jsonb_build_object('is_admin', false) order by s.requested_at desc)
        from public.signup_approvals s where s.status = 'pending'), '[]'::jsonb),
    'admin_requests', coalesce((
      select jsonb_agg(to_jsonb(s) || jsonb_build_object('is_admin', false) order by s.admin_requested_at desc)
        from public.signup_approvals s
       where s.status = 'approved' and s.admin_requested_at is not null
         and not exists (select 1 from public.user_roles r where r.user_id = s.user_id and r.role = 'admin')), '[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(x.m order by x.requested_at desc) from (
        select to_jsonb(s) || jsonb_build_object(
                 'is_admin', exists (select 1 from public.user_roles r where r.user_id = s.user_id and r.role = 'admin'),
                 'is_owner', lower(s.email) = public.founding_owner_email()) as m,
               s.requested_at
          from public.signup_approvals s
         where s.status = 'approved'
         order by s.requested_at desc limit 200) x), '[]'::jsonb),
    'rejected', coalesce((
      select jsonb_agg(to_jsonb(s) || jsonb_build_object('is_admin', false) order by s.decided_at desc)
        from (select * from public.signup_approvals where status = 'rejected' order by decided_at desc nulls last limit 50) s), '[]'::jsonb)
  );
end;
$$;
revoke execute on function public.list_signup_approvals() from anon, public;
grant execute on function public.list_signup_approvals() to authenticated;

-- Shared by decide_signup / set_member_role: make the role rows match the choice.
create or replace function public._apply_member_role(_user_id uuid, _role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_roles (user_id, role) values (_user_id, 'user') on conflict do nothing;
  if _role = 'admin' then
    insert into public.user_roles (user_id, role) values (_user_id, 'admin') on conflict do nothing;
  else
    delete from public.user_roles where user_id = _user_id and role = 'admin';
  end if;
  perform public.log_audit_event(
    case when _role = 'admin' then 'role.grant_admin' else 'role.revoke_admin' end,
    'user_roles', _user_id::text, jsonb_build_object('role', _role));
end;
$$;
revoke execute on function public._apply_member_role(uuid, text) from anon, authenticated, public;

create or replace function public.decide_signup(_user_id uuid, _decision text, _role text default 'user') returns jsonb
language plpgsql security definer set search_path = public, auth as $$
declare
  v_role text := lower(trim(coalesce(nullif(_role, ''), 'user')));
  v_decision text := lower(trim(coalesce(_decision, '')));
begin
  if not public.is_owner_or_super() then
    raise exception 'Only the owner can approve or reject accounts';
  end if;
  if v_decision not in ('approve','reject') then
    raise exception 'Decision must be approve or reject';
  end if;
  if v_role not in ('user','admin') then
    raise exception 'Role must be user or admin';
  end if;
  if public.is_founding_owner(_user_id) then
    raise exception 'The owner account cannot be changed';
  end if;

  if v_decision = 'reject' then
    update public.signup_approvals
       set status = 'rejected', decided_at = now(), decided_by = auth.uid()
     where user_id = _user_id;
    if not found then raise exception 'No signup found for that account'; end if;
    perform public._apply_member_role(_user_id, 'user');
    return jsonb_build_object('ok', true, 'status', 'rejected');
  end if;

  update public.signup_approvals
     set status = 'approved', granted_role = v_role, decided_at = now(), decided_by = auth.uid()
   where user_id = _user_id;
  if not found then raise exception 'No signup found for that account'; end if;
  perform public._apply_member_role(_user_id, v_role);
  return jsonb_build_object('ok', true, 'status', 'approved', 'role', v_role);
end;
$$;
revoke execute on function public.decide_signup(uuid, text, text) from anon, public;
grant execute on function public.decide_signup(uuid, text, text) to authenticated;

-- One-tap role change for an existing member ("Make admin" / "Remove admin").
create or replace function public.set_member_role(_user_id uuid, _role text) returns jsonb
language plpgsql security definer set search_path = public, auth as $$
declare
  v_role text := lower(trim(coalesce(nullif(_role, ''), 'user')));
begin
  if not public.is_owner_or_super() then
    raise exception 'Only the owner can change roles';
  end if;
  if v_role not in ('user','admin') then
    raise exception 'Role must be user or admin';
  end if;
  if public.is_founding_owner(_user_id) then
    raise exception 'The owner account cannot be changed';
  end if;

  insert into public.signup_approvals (user_id, email, requested_role, status, granted_role, decided_at, decided_by)
  select u.id, lower(coalesce(u.email, '')), 'user', 'approved', v_role, now(), auth.uid()
    from auth.users u where u.id = _user_id
  on conflict (user_id) do update
    set status = 'approved', granted_role = v_role, decided_at = now(), decided_by = auth.uid();
  if not found then raise exception 'No such account'; end if;

  perform public._apply_member_role(_user_id, v_role);
  return jsonb_build_object('ok', true, 'role', v_role);
end;
$$;
revoke execute on function public.set_member_role(uuid, text) from anon, public;
grant execute on function public.set_member_role(uuid, text) to authenticated;

create or replace function public.set_require_approvals(_on boolean) returns jsonb
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_owner_or_super() then
    raise exception 'Only the owner can change approval settings';
  end if;
  update public.signup_policy
     set require_approvals = coalesce(_on, false),
         require_approvals_since = case when coalesce(_on, false) then now() else null end,
         updated_at = now(),
         updated_by = auth.uid()
   where id;
  -- Switching approvals off releases anyone still waiting (nobody stays locked out).
  if not coalesce(_on, false) then
    update public.signup_approvals
       set status = 'approved', granted_role = coalesce(granted_role, 'user'),
           decided_at = now(), decided_by = auth.uid()
     where status = 'pending';
  end if;
  return jsonb_build_object('ok', true, 'require_approvals', coalesce(_on, false));
end;
$$;
revoke execute on function public.set_require_approvals(boolean) from anon, public;
grant execute on function public.set_require_approvals(boolean) to authenticated;

-- ── Retire the shared-password path ─────────────────────────────────────────
-- These RPCs took a caller-supplied "orbit" password. Nothing calls them any
-- more; drop them, the fake seeded tester row, and the anonymous request door.
drop function if exists public.list_admin_access_queue(text);
drop function if exists public.list_artwork_submissions_queue(text, text);
delete from public.admin_access_requests where lower(email) = 'tester-verify@example.com';
drop policy if exists admin_access_requests_self_request on public.admin_access_requests;
revoke insert on public.admin_access_requests from anon, authenticated;

notify pgrst, 'reload schema';
