create table if not exists public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  job_id text not null,
  job_title text not null,
  company text,
  job_url text,
  location text,
  department text,
  source text,
  workplace text,
  job_description text,
  created_at timestamptz default now(),
  unique (profile_id, job_id)
);

alter table public.saved_jobs enable row level security;

create policy "saved_jobs_select_own" on public.saved_jobs
  for select to authenticated using ((select auth.uid()) = profile_id);

create policy "saved_jobs_insert_own" on public.saved_jobs
  for insert to authenticated with check ((select auth.uid()) = profile_id);

create policy "saved_jobs_delete_own" on public.saved_jobs
  for delete to authenticated using ((select auth.uid()) = profile_id);

grant select, insert, delete on public.saved_jobs to authenticated;
