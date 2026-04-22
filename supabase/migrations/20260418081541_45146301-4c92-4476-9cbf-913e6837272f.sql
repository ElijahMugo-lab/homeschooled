-- educator_profiles.id should remain the auth.users(id) (auth.uid()).
-- Ensure there is no random default and the FK exists.
alter table public.educator_profiles alter column id drop default;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'educator_profiles_id_fkey'
      and conrelid = 'public.educator_profiles'::regclass
  ) then
    alter table public.educator_profiles
      add constraint educator_profiles_id_fkey
      foreign key (id) references auth.users(id) on delete cascade;
  end if;
end
$$;

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
