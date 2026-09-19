-- Compatibilidade para instalações onde a migração de mensagens ainda não foi executada.
alter table public.messages
  add column if not exists expires_at timestamptz not null default (now() + interval '15 days');

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

-- O contacto permanece no perfil e só é devolvido pela aplicação depois de o pedido ser aceite.
