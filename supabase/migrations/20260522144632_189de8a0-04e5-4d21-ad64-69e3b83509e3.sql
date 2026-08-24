
-- Enums
create type public.app_role as enum ('admin', 'user');
create type public.art_medium as enum ('oil', 'watercolor', 'pastel', 'sculpture', 'photograph', 'print', 'mixed_media', 'acrylic', 'drawing');
create type public.render_status as enum ('pending', 'processing', 'completed', 'failed');

-- updated_at trigger fn
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  external_source text,
  external_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

-- Artists
create table public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bio text,
  era text,
  portrait_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.artists enable row level security;
create trigger artists_updated before update on public.artists
  for each row execute function public.set_updated_at();

-- Artworks
create table public.artworks (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references public.artists(id) on delete set null,
  title text not null,
  medium public.art_medium not null,
  year text,
  image_url text not null,
  dominant_palette text[],
  default_frame text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.artworks enable row level security;
create index artworks_medium_idx on public.artworks(medium);
create trigger artworks_updated before update on public.artworks
  for each row execute function public.set_updated_at();

-- Styles
create table public.styles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  prompt_fragment text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.styles enable row level security;

-- Renders
create table public.renders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_image_url text not null,
  result_image_url text,
  style_id uuid references public.styles(id) on delete set null,
  artwork_ids uuid[] not null default '{}',
  media_filter public.art_medium[] not null default '{}',
  prompt text,
  status public.render_status not null default 'pending',
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.renders enable row level security;
create index renders_user_idx on public.renders(user_id, created_at desc);
create trigger renders_updated before update on public.renders
  for each row execute function public.set_updated_at();

-- RLS policies
-- profiles
create policy "profiles_self_select" on public.profiles for select using (auth.uid() = id);
create policy "profiles_self_update" on public.profiles for update using (auth.uid() = id);
create policy "profiles_self_insert" on public.profiles for insert with check (auth.uid() = id);

-- user_roles
create policy "user_roles_self_select" on public.user_roles for select using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "user_roles_admin_all" on public.user_roles for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- catalog readable to any authenticated user
create policy "artists_read_auth" on public.artists for select to authenticated using (true);
create policy "artists_admin_write" on public.artists for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "artworks_read_auth" on public.artworks for select to authenticated using (is_active = true or public.has_role(auth.uid(), 'admin'));
create policy "artworks_admin_write" on public.artworks for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "styles_read_auth" on public.styles for select to authenticated using (is_active = true or public.has_role(auth.uid(), 'admin'));
create policy "styles_admin_write" on public.styles for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- renders: own rows only
create policy "renders_own_select" on public.renders for select using (auth.uid() = user_id);
create policy "renders_own_insert" on public.renders for insert with check (auth.uid() = user_id);
create policy "renders_own_update" on public.renders for update using (auth.uid() = user_id);
create policy "renders_own_delete" on public.renders for delete using (auth.uid() = user_id);

-- new user trigger -> create profile + assign 'user' role
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, external_source, external_user_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'external_source',
    new.raw_user_meta_data->>'external_user_id'
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role) values (new.id, 'user')
  on conflict do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Storage buckets
insert into storage.buckets (id, name, public) values
  ('rooms','rooms',false),
  ('renders','renders',true),
  ('artworks','artworks',true)
on conflict (id) do nothing;

-- rooms bucket: private, per-user folder (path starts with user_id/)
create policy "rooms_own_read" on storage.objects for select to authenticated
  using (bucket_id='rooms' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "rooms_own_write" on storage.objects for insert to authenticated
  with check (bucket_id='rooms' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "rooms_own_delete" on storage.objects for delete to authenticated
  using (bucket_id='rooms' and auth.uid()::text = (storage.foldername(name))[1]);

-- renders bucket: public read, owner write/delete
create policy "renders_public_read" on storage.objects for select using (bucket_id='renders');
create policy "renders_own_write" on storage.objects for insert to authenticated
  with check (bucket_id='renders' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "renders_own_delete" on storage.objects for delete to authenticated
  using (bucket_id='renders' and auth.uid()::text = (storage.foldername(name))[1]);

-- artworks bucket: public read, admin write
create policy "artworks_public_read" on storage.objects for select using (bucket_id='artworks');
create policy "artworks_admin_write" on storage.objects for insert to authenticated
  with check (bucket_id='artworks' and public.has_role(auth.uid(),'admin'));
create policy "artworks_admin_update" on storage.objects for update to authenticated
  using (bucket_id='artworks' and public.has_role(auth.uid(),'admin'));
create policy "artworks_admin_delete" on storage.objects for delete to authenticated
  using (bucket_id='artworks' and public.has_role(auth.uid(),'admin'));
