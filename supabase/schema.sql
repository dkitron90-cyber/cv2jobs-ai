create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  created_at timestamptz default now()
);

create table if not exists public.cvs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  file_name text not null,
  extracted_text text not null,
  analysis jsonb,
  created_at timestamptz default now()
);

create table if not exists public.job_matches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  cv_id uuid references public.cvs(id) on delete set null,
  job_title text,
  company text,
  job_url text,
  job_description text not null,
  match_score int,
  match_result jsonb,
  status text default 'new',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.cvs enable row level security;
alter table public.job_matches enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);

create policy "cvs_select_own" on public.cvs for select to authenticated using ((select auth.uid()) = profile_id);
create policy "cvs_insert_own" on public.cvs for insert to authenticated with check ((select auth.uid()) = profile_id);
create policy "cvs_update_own" on public.cvs for update to authenticated using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);
create policy "cvs_delete_own" on public.cvs for delete to authenticated using ((select auth.uid()) = profile_id);

create policy "job_matches_select_own" on public.job_matches for select to authenticated using ((select auth.uid()) = profile_id);
create policy "job_matches_insert_own" on public.job_matches for insert to authenticated with check ((select auth.uid()) = profile_id);
create policy "job_matches_update_own" on public.job_matches for update to authenticated using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);
create policy "job_matches_delete_own" on public.job_matches for delete to authenticated using ((select auth.uid()) = profile_id);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.cvs to authenticated;
grant select, insert, update, delete on public.job_matches to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
