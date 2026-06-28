create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  full_name text,
  created_at timestamptz default now()
);

create table if not exists cvs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  file_name text not null,
  extracted_text text not null,
  analysis jsonb,
  created_at timestamptz default now()
);

create table if not exists job_matches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  cv_id uuid references cvs(id) on delete cascade,
  job_title text,
  company text,
  job_url text,
  job_description text not null,
  match_score int,
  match_result jsonb,
  status text default 'new',
  created_at timestamptz default now()
);
