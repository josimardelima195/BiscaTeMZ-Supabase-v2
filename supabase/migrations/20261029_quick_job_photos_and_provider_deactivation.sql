alter table public.quick_jobs
  add column if not exists photo_path text;

alter table public.provider_profiles
  add column if not exists deactivated_at timestamptz;

create index if not exists provider_profiles_active_idx
  on public.provider_profiles (verification, available, deactivated_at);

insert into storage.buckets (id, name, public)
values ('quick-job-photos', 'quick-job-photos', true)
on conflict (id) do update set public = true;
