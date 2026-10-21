create table if not exists public.quick_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 5 and 120),
  details text not null check (char_length(details) between 10 and 1800),
  category text not null default 'Outro',
  budget numeric(12,2) check (budget is null or budget >= 0),
  currency text not null default 'MZN',
  mode text not null default 'presencial' check (mode in ('presencial','online')),
  location text,
  preferred_at timestamptz,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table public.quick_jobs enable row level security;
drop policy if exists "public open quick jobs" on public.quick_jobs;
create policy "public open quick jobs" on public.quick_jobs for select using (
  (status='open' and (expires_at is null or expires_at > now()))
  or owner_id=auth.uid() or public.is_admin()
);
create index if not exists quick_jobs_status_created_idx on public.quick_jobs(status, created_at desc);
