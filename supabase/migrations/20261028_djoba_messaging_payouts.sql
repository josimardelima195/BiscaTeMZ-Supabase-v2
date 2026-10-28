-- Djoba Já: mensagens lidas, retenção de 30 dias e dados de recebimento.
alter table public.messages
  add column if not exists read_at timestamptz;

update public.messages
set expires_at = created_at + interval '30 days'
where expires_at is null or expires_at < created_at + interval '30 days';

alter table public.provider_profiles
  add column if not exists mpesa_number text,
  add column if not exists emola_number text,
  add column if not exists bank_name text,
  add column if not exists bank_account text,
  add column if not exists bank_nib text,
  add column if not exists balance_amount numeric(12,2) not null default 0;

create index if not exists messages_unread_idx on public.messages (conversation_id, sender_id, read_at);
create index if not exists messages_expiry_30d_idx on public.messages (expires_at);
