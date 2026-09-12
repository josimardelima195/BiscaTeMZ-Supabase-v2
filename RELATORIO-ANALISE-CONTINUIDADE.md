# Relatório de análise e continuidade — BiscaTeMZ

**Data da análise:** 12 de setembro de 2026  
**Projeto analisado:** `BiscaTeMZ-Supabase-v11-conta-chat-pagamentos(1).zip`  
**Site publicado:** [bisca-te-mz-supabase-v2.vercel.app](https://bisca-te-mz-supabase-v2.vercel.app/)

## Conclusão executiva

A versão publicada está acessível e o fluxo público principal carrega corretamente. A aplicação apresenta a marca BiscaTeMZ, pesquisa de prestadores, categorias profissionais, autenticação, cadastro de prestadores, área de conta, painel administrativo e a página de pagamento manual.

O código enviado também contém uma base coerente para o pagamento manual por transferência para o número `868787572`. O cálculo implementado é de **7% para a plataforma** e **93% para o prestador**, sem integração automática com M-Pesa, e-Mola, mKesh ou cartões.

Contudo, a cópia enviada **não está pronta para ser considerada completamente validada**. Existe uma falha de build quando as variáveis Supabase não estão disponíveis durante a compilação. Além disso, há riscos de consistência no fluxo de pagamentos e funcionalidades declaradas nas migrações que ainda não estão totalmente implementadas na aplicação.

A recomendação é continuar a partir deste código, mas corrigir primeiro os problemas de alta prioridade descritos abaixo. Não alterei o site publicado nem executei operações de escrita no Supabase.

## Resultado dos testes

| Área testada | Resultado | Observação |
|---|---:|---|
| Página inicial publicada | Aprovado | Respondeu HTTP 200 e carregou a interface pública. |
| Conteúdo público | Aprovado | Foram exibidos profissionais, categorias, pesquisa e navegação. |
| Página `/admin` | Aprovado com ressalva | Respondeu HTTP 200; o painel requer sessão administrativa. |
| Página `/conta` | Aprovado com ressalva | Respondeu HTTP 200; as operações dependem de autenticação. |
| Página `/pagamento/teste` | Aprovado | Exibe o número manual `868787572`, valor e upload do comprovativo. |
| Endpoint sem autenticação | Aprovado | `GET /api/payments/teste` respondeu HTTP 401. |
| Build sem variáveis Supabase | Falhou | O build falha ao prerenderizar `/admin` com `supabaseUrl is required`. |
| Build com variáveis temporárias | Aprovado | `npm run build` terminou e gerou as rotas. |
| Migração `20260904_payments_future.sql` | Aprovada | Sintaxe e desenho geral coerentes. |
| Migração `20260905_payment_workflow.sql` | Aprovada com ressalvas | Sintaxe coerente, mas existem lacunas de implementação e auditoria. |

## O que já está implementado

A migração futura cria `service_payments` com valor bruto, taxa da plataforma, valor do prestador, moeda, estado, vencimento e referências externas. A migração manual adiciona o número de pagamento, dados do comprovativo, confirmação administrativa, estado de transferência ao prestador e prazo de pagamento.

A rota `POST /api/payments/[requestId]` exige utilizador autenticado, valida o comprovativo como imagem ou PDF, limita o tamanho a 8 MB, confirma que o pedido pertence ao cliente e só aceita pedidos nos estados `accepted` ou `scheduled`. O comprovativo é guardado no bucket privado `private-documents`.

A rota administrativa gera URLs assinadas temporárias para os comprovativos. Apenas utilizadores com `role = 'admin'` podem consultar ou alterar as transações através dessas rotas. A confirmação e o registo do envio ao prestador também geram notificações.

A interface administrativa `/admin/transacoes` mostra cliente, prestador, valor bruto, comissão, valor do prestador, estado, comprovativo e ações de confirmação ou registo de envio.

## Problemas prioritários encontrados

### 1. O build depende de variáveis Supabase durante o prerendering

Sem `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, o build falha ao gerar `/admin`. A causa é a criação do cliente Supabase no escopo do módulo da página administrativa:

```ts
const supabase = browserSupabase();
```

A validação demonstrou que o mesmo código compila quando são fornecidos valores temporários válidos. Portanto, o problema não é de TypeScript, mas de configuração de ambiente durante o build.

**Prioridade:** alta.  
**Correção recomendada:** garantir as variáveis na Vercel e no ambiente local, e preferencialmente criar o cliente dentro de um contexto de browser ou usar uma inicialização tolerante durante o prerendering. Os valores reais nunca devem ser colocados no repositório.

### 2. O cliente pode reenviar comprovativo depois da confirmação

A rota de pagamento usa `upsert` por `request_id` e não verifica o estado atual antes de aceitar um novo comprovativo. Assim, um cliente poderia reenviar um comprovativo depois de a administração ter marcado o pagamento como `paid` ou depois de o payout ter sido registado. O `upsert` pode substituir campos do pagamento e devolver a transação para `pending`.

**Prioridade:** alta.  
**Correção recomendada:** antes do upload, carregar a transação existente e rejeitar o reenvio quando o estado for `paid`, `authorized`, `refunded` ou quando `payout_status` já for `sent` ou `confirmed`. Para substituir um comprovativo pendente, deve existir uma regra explícita e uma confirmação administrativa.

### 3. As transições administrativas não são estritas

A rota administrativa permite `confirm` e `reject` sem exigir que o estado anterior seja `pending`. Também não impede claramente uma nova alteração depois de uma transação ter sido confirmada ou recusada.

**Prioridade:** alta.  
**Correção recomendada:** implementar transições condicionais no banco ou numa operação transacional. O mínimo esperado é `pending -> paid`, `pending -> failed` e `paid -> payout enviado`. Estados finais não devem voltar a estados anteriores.

### 4. A auditoria criada pela migração não é usada nas ações de pagamento

A tabela `admin_access_logs` existe e a leitura de conversas administrativas já regista alguns acessos, mas as ações financeiras de confirmar, recusar e marcar payout não inserem registos de auditoria.

**Prioridade:** alta.  
**Correção recomendada:** registar, no mínimo, `admin_id`, `resource_type = 'service_payment'`, `resource_id`, ação, data, estado anterior e estado novo. Idealmente, a tabela deve receber também uma razão ou referência operacional.

### 5. O valor do pagamento é aceite pelo cliente

A rota calcula corretamente 7% e 93% no servidor, mas aceita o `amount` enviado pelo formulário sem comparar esse valor com um preço definido, orçamento aprovado ou valor congelado no pedido. Um cliente pode enviar um comprovativo com um valor arbitrário.

**Prioridade:** alta.  
**Correção recomendada:** guardar no pedido um valor acordado pelo cliente e pelo prestador, ou exigir que a administração valide explicitamente qualquer diferença. O servidor deve ser a fonte de verdade do valor devido.

### 6. A migração prepara expiração de mensagens, mas não existe limpeza automática

A coluna `messages.expires_at` é criada e as consultas de mensagens filtram mensagens expiradas. Isso impede a leitura normal após o prazo, mas não elimina fisicamente os registos. A retenção da informação continua indefinida no banco.

**Prioridade:** média.  
**Correção recomendada:** adicionar uma rotina agendada ou função de limpeza, com uma política clara de retenção e atenção a requisitos legais ou operacionais.

### 7. O estado `confirmed` do payout não é utilizado

A migração permite `not_started`, `due`, `sent` e `confirmed`, mas a API administrativa apenas marca `sent`. Não existe uma ação para confirmar o recebimento pelo prestador.

**Prioridade:** média.  
**Correção recomendada:** decidir se `confirmed` será usado. Se for, adicionar uma ação autenticada e uma notificação correspondente. Se não for necessário nesta fase, simplificar o enum e a interface.

### 8. Falta um ficheiro `robots.txt` publicado

A verificação HTTP a `/robots.txt` respondeu 404. Isto não impede o funcionamento da aplicação, mas é uma lacuna de publicação e SEO técnico.

**Prioridade:** baixa.  
**Correção recomendada:** adicionar um ficheiro pequeno em `public/robots.txt`, sem expor rotas privadas desnecessariamente.

## Observações de segurança

O bucket `private-documents` está configurado como privado e a área administrativa usa URLs assinadas com validade de 900 segundos. Essa abordagem é adequada para comprovativos e documentos sensíveis.

As rotas de servidor usam a chave administrativa do Supabase. Essa chave deve permanecer exclusivamente no ambiente da Vercel e no servidor. Ela nunca deve ser enviada para o browser, para o GitHub ou para respostas JSON.

A aplicação usa `Access-Control-Allow-Origin: *` nas respostas observadas. Como a autenticação principal usa tokens e o site é público, isso não demonstrou uma exploração imediata no teste anónimo, mas recomenda-se restringir origens quando existirem operações autenticadas via browser ou quando forem adicionados webhooks e integrações financeiras.

O número `868787572` aparece no código e na interface, conforme o fluxo manual definido. Se esse número for alterado futuramente, deverá existir uma única configuração no servidor para evitar divergência entre a página do cliente, a API e o painel administrativo.

## Fluxo manual validado conceitualmente

O fluxo atual é:

1. O cliente autentica-se.
2. O cliente aceita ou agenda um pedido.
3. O cliente transfere manualmente para `868787572`.
4. O cliente envia o valor e o comprovativo.
5. O servidor guarda o comprovativo de forma privada e calcula 7% e 93%.
6. O administrador confirma ou recusa o pagamento.
7. Depois da confirmação, o administrador regista manualmente o envio dos 93% ao prestador.

Esse fluxo **não movimenta dinheiro automaticamente**. A aplicação apenas regista estados e referências operacionais.

## Preparação para pagamentos futuros

A migração `20260904_payments_future.sql` está corretamente descrita como preparação. Ela não liga nenhum provedor nem deve ser tratada como integração de pagamentos.

Uma integração real exigirá contas comerciais, credenciais separadas para sandbox e produção, validação de assinatura de webhooks, idempotência, reconciliação, tratamento de reembolsos e testes específicos do provedor. Esses elementos não devem ser adicionados apenas no frontend.

## Próxima sequência recomendada

A continuação mais segura é corrigir o build e endurecer o fluxo financeiro antes de adicionar novas funcionalidades visuais. A ordem recomendada é a seguinte:

| Ordem | Trabalho | Resultado esperado |
|---:|---|---|
| 1 | Corrigir configuração e inicialização Supabase | Build reprodutível localmente e na Vercel. |
| 2 | Bloquear reenvio indevido de comprovativos | Pagamentos confirmados não podem regressar a `pending`. |
| 3 | Implementar transições condicionais | Estados financeiros ficam consistentes e idempotentes. |
| 4 | Adicionar auditoria financeira | Cada ação administrativa fica rastreável. |
| 5 | Fixar ou validar o valor acordado | O cliente não escolhe arbitrariamente o valor devido. |
| 6 | Testar com utilizador cliente e admin | Fluxo completo validado sem expor dados reais. |
| 7 | Adicionar limpeza de mensagens e `robots.txt` | Retenção e publicação ficam completas. |

## Base de continuidade

Para futuras alterações, esta cópia deve ser tratada como a base de trabalho atual. As áreas principais estão organizadas assim:

| Área | Localização |
|---|---|
| Página inicial | `app/page.tsx` |
| Conta | `app/conta/page.tsx` |
| Pagamento do cliente | `app/pagamento/[requestId]/page.tsx` |
| API de pagamento | `app/api/payments/[requestId]/route.ts` |
| API administrativa financeira | `app/api/admin/payments/route.ts` |
| Painel administrativo | `app/admin/page.tsx` |
| Transações administrativas | `app/admin/transacoes/page.tsx` |
| Schema base | `supabase/schema.sql` |
| Pagamentos futuros | `supabase/migrations/20260904_payments_future.sql` |
| Fluxo manual | `supabase/migrations/20260905_payment_workflow.sql` |

Nenhuma alteração foi aplicada ao GitHub, à Vercel ou ao Supabase nesta análise.

## Referências

[1]: https://bisca-te-mz-supabase-v2.vercel.app/ "Site publicado BiscaTeMZ analisado em 12 de setembro de 2026"

[2]: https://nextjs.org/docs/messages/prerender-error "Next.js — documentação sobre erros de prerendering"

[3]: https://supabase.com/docs/guides/storage "Supabase Storage — documentação de buckets e ficheiros"

[4]: https://supabase.com/docs/guides/auth/row-level-security "Supabase — Row Level Security"
