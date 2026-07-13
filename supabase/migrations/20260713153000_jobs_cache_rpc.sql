create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

revoke all on table public.app_settings from anon, authenticated;

insert into public.app_settings (key, value)
values ('jobs_cache_secret', encode(gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

create or replace function public.upsert_jobs_cache(snapshot jsonb, cache_secret text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_secret text;
begin
  select value into expected_secret
  from public.app_settings
  where key = 'jobs_cache_secret';

  if expected_secret is null or cache_secret is distinct from expected_secret then
    raise exception 'unauthorized';
  end if;

  insert into public.jobs_cache (id, payload, refreshed_at, updated_at)
  values (
    'latest',
    snapshot,
    coalesce((snapshot->>'refreshedAt')::timestamptz, now()),
    now()
  )
  on conflict (id) do update set
    payload = excluded.payload,
    refreshed_at = excluded.refreshed_at,
    updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.upsert_jobs_cache(jsonb, text) from public;
grant execute on function public.upsert_jobs_cache(jsonb, text) to anon, authenticated, service_role;
