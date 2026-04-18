alter table public.educator_profiles drop constraint if exists educator_profiles_id_fkey;
alter table public.educator_profiles alter column id set default gen_random_uuid();

drop policy if exists "Educators insert own profile" on public.educator_profiles;
drop policy if exists "Educators update own profile" on public.educator_profiles;
drop policy if exists "Educators view own profile" on public.educator_profiles;

create policy "Educators insert own profile"
  on public.educator_profiles for insert to authenticated
  with check (auth.uid() = id and public.has_role(auth.uid(), 'educator'));

create policy "Educators update own profile"
  on public.educator_profiles for update to authenticated using (auth.uid() = id);

create policy "Educators view own profile"
  on public.educator_profiles for select to authenticated using (auth.uid() = id);