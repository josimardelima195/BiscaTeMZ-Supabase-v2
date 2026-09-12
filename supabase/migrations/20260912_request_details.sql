-- Organiza o pedido com modalidade explícita sem alterar pedidos existentes.
alter table public.service_requests
  add column if not exists service_mode text not null default 'presencial'
  check (service_mode in ('presencial','online'));

create index if not exists service_requests_preferred_at_idx
  on public.service_requests (preferred_at);
