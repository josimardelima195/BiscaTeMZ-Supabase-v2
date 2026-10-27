alter table public.service_requests
  add column if not exists estimated_amount numeric(12,2)
    check (estimated_amount is null or estimated_amount > 0),
  add column if not exists estimate_note text,
  add column if not exists estimated_at timestamptz;

create index if not exists service_requests_provider_status_idx
  on public.service_requests(provider_id, status, created_at desc);
