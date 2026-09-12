# Atualização de chat e pedidos

Esta versão mantém a interface base e acrescenta persistência visual do chat, pedidos organizados na área **Conta**, modalidade presencial ou online, horário exato, local e descrição estruturada do problema.

Antes do deploy, execute uma vez no SQL Editor do mesmo projeto Supabase:

```sql
alter table public.service_requests
  add column if not exists service_mode text not null default 'presencial'
  check (service_mode in ('presencial','online'));

create index if not exists service_requests_preferred_at_idx
  on public.service_requests (preferred_at);
```

A migração completa está em `supabase/migrations/20260912_request_details.sql`. Não é necessário apagar dados existentes. Depois, substitua os ficheiros no GitHub e aguarde o deploy da Vercel.

As variáveis `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SECRET_KEY` continuam a ser configuradas apenas na Vercel; não devem ser adicionadas ao GitHub.
