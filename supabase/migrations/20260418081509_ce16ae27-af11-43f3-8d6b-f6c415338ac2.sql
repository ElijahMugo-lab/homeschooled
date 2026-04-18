create type public.app_role as enum ('parent', 'educator', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles viewable by all authenticated"
  on public.profiles for select to authenticated using (true);

create policy "Users update own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);

create policy "Users insert own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users view own roles"
  on public.user_roles for select to authenticated using (auth.uid() = user_id);

create policy "Users insert own role on signup"
  on public.user_roles for insert to authenticated with check (auth.uid() = user_id);

create table public.educator_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  philosophy text,
  subjects text[] not null default '{}',
  grade_levels text[] not null default '{}',
  bio text,
  hourly_rate_kes integer,
  is_verified boolean not null default false,
  rating_avg numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.educator_profiles enable row level security;

create policy "Verified educators are public"
  on public.educator_profiles for select using (is_verified = true);

create policy "Educators view own profile"
  on public.educator_profiles for select to authenticated using (auth.uid() = id);

create policy "Educators insert own profile"
  on public.educator_profiles for insert to authenticated
  with check (auth.uid() = id and public.has_role(auth.uid(), 'educator'));

create policy "Educators update own profile"
  on public.educator_profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();