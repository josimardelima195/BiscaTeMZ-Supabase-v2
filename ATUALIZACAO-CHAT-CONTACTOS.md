# Atualização do chat e contactos

Esta versão corrige a criação de conversas já aceites, garante os participantes do chat, adiciona o botão de sair da conta, mostra o aviso de pedido aceite e libera os contactos apenas depois da aceitação.

Antes do deploy, execute no SQL Editor do projeto Supabase, caso ainda não tenha executado as migrações anteriores:

```sql
alter table public.messages
  add column if not exists expires_at timestamptz not null default (now() + interval '15 days');

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);
```

O mesmo SQL está em `supabase/migrations/20260919_chat_contacts.sql`.

O contacto é lido do campo **Contacto** na área **Conta**. O cliente e o prestador só recebem o número um do outro quando o pedido está aceite, agendado ou concluído.

Depois de substituir os ficheiros no GitHub, aguarde o deploy da Vercel e teste:

1. Cliente preenche o contacto na conta.
2. Cliente faz um pedido.
3. Prestador aceita o pedido.
4. Ambos abrem a conversa correspondente.
5. Cada lado confirma que vê o contacto da outra pessoa.
6. O cliente testa **Sair da conta** e entra novamente com outra conta.
