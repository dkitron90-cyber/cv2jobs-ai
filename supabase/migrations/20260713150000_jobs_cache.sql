create table if not exists public.jobs_cache (
  id text primary key default 'latest',
  payload jsonb not null,
  refreshed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.jobs_cache enable row level security;

create policy "jobs_cache_select_public" on public.jobs_cache
  for select to anon, authenticated using (true);

grant select on public.jobs_cache to anon, authenticated;
