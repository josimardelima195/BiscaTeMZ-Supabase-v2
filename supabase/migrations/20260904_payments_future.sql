-- Preparação para pagamentos futuros; esta migração NÃO liga nenhum provedor nem movimenta dinheiro.
-- A integração real deverá usar credenciais de comerciante, sandbox e webhooks verificados.
create type public.payment_status as enum ('pending','authorized','paid','failed','refunded','cancelled');

create table if not exists public.service_payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.service_requests(id) on delete cascade,
  payer_id uuid not null references public.profiles(id),
  provider_id uuid not null references public.profiles(id),
  gross_amount numeric(12,2) not null check (gross_amount > 0),
  platform_fee_percent numeric(5,2) not null default 7.00 check (platform_fee_percent between 0 and 100),
  platform_fee_amount numeric(12,2) not null default 0 check (platform_fee_amount >= 0),
  provider_amount numeric(12,2) not null default 0 check (provider_amount >= 0),
  currency text not null default 'MZN',
  provider text,
  external_reference text,
  status public.payment_status not null default 'pending',
  due_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.service_payments enable row level security;
drop policy if exists "payment participants or admin" on public.service_payments;
create policy "payment participants or admin" on public.service_payments
  for select using (payer_id = auth.uid() or provider_id = auth.uid() or public.is_admin());

-- O servidor deve calcular: platform_fee_amount = gross_amount * 0.07
-- e provider_amount = gross_amount - platform_fee_amount.
-- Não colocar API keys de M-Pesa, e-Mola, mKesh ou cartões nesta base de dados.
