-- Fluxo manual de pagamento: não movimenta dinheiro automaticamente.
-- O cliente transfere para 868787572, envia o comprovativo, e o admin confirma.

alter table public.service_payments
  add column if not exists payment_phone text not null default '868787572',
  add column if not exists proof_storage_path text,
  add column if not exists proof_file_name text,
  add column if not exists proof_uploaded_at timestamptz,
  add column if not exists confirmed_by uuid references public.profiles(id),
  add column if not exists confirmed_at timestamptz,
  add column if not exists payout_status text not null default 'not_started' check (payout_status in ('not_started','due','sent','confirmed')),
  add column if not exists payout_reference text,
  add column if not exists payout_sent_at timestamptz,
  add column if not exists payment_deadline_at timestamptz;

alter table public.messages
  add column if not exists expires_at timestamptz not null default (now() + interval '15 days');

create table if not exists public.admin_access_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  resource_type text not null,
  resource_id uuid,
  action text not null,
  created_at timestamptz not null default now()
);

alter table public.admin_access_logs enable row level security;
drop policy if exists "admins read access logs" on public.admin_access_logs;
create policy "admins read access logs" on public.admin_access_logs
  for select using (public.is_admin());

create index if not exists messages_expiry_idx on public.messages (expires_at);
create index if not exists service_payments_status_idx on public.service_payments (status, payment_deadline_at);

-- Apenas administradores podem confirmar o pagamento e marcar a transferência ao prestador.
-- A aplicação deve calcular plataforma = 7% e prestador = 93% no servidor.
