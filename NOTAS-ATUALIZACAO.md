# BiscaTeMZ-Supabase — notas da atualização

Esta cópia foi preparada a partir da versão Supabase fornecida e não altera o projeto antigo nem a versão publicada automaticamente.

## Alterações incluídas

A rota administrativa agora conserva o bucket `private-documents`, gera URLs assinadas com validade temporária e devolve um diagnóstico seguro quando o Supabase não consegue gerar a URL. A chave secreta nunca é enviada ao navegador.

O painel `/admin` agora apresenta uma miniatura para imagens de BI, um cartão próprio para documentos PDF e uma mensagem explícita quando a pré-visualização não está disponível. Os documentos continuam privados.

A interface recebeu uma camada visual inspirada no ZIP de referência: verde BiscaTeMZ, detalhes dourados, cabeçalho translúcido, sombras suaves, cartões mais trabalhados, hero com fundo em gradiente e painel administrativo com cartões responsivos.

A infraestrutura continua a ser exclusivamente Next.js + Supabase. Não foram copiados Firebase, Google Drive, bases de dados ou regras do ZIP de referência.

## Ficheiros alterados

- `app/api/admin/registrations/route.ts`
- `app/admin/page.tsx`
- `app/globals.css`

## Teste local

O comando `npm run build` foi executado com sucesso usando valores temporários apenas durante o processo de validação. Nenhum segredo real foi incluído nesta cópia ou no pacote final.

## Publicação segura

Antes de substituir ficheiros no GitHub, faça uma cópia ou crie uma branch de backup do estado atual. Nunca envie `.env`, `.env.local`, `node_modules`, `.next` ou qualquer valor de `SUPABASE_SECRET_KEY` para o GitHub.

Depois de publicar os ficheiros no repositório, aguarde o novo deploy da Vercel. Em seguida, abra `/admin`, entre com a conta admin, clique em **Atualizar** e confirme se as miniaturas de BI aparecem. Se alguma falhar, o cartão passa a mostrar `indisponível`; nesse caso, a mensagem técnica deve ser analisada na configuração do bucket e da variável privada da Vercel, sem publicar a chave.

## Estatísticas por área

A página inicial agora conta apenas os prestadores aprovados que já existem no Supabase e agrupa-os pelo campo de profissão/categoria. A secção **Profissionais por área** atualiza-se automaticamente quando o site recarrega os prestadores aprovados. Quando ainda não existem prestadores aprovados, aparece uma mensagem explicativa em vez de números inventados.

## Recursos adicionais desta versão

A página inicial ganhou pesquisa por nome, profissão e localização, navegação inferior no telemóvel, estatísticas por profissão e uma lista maior de categorias profissionais.

O painel `/admin` ganhou o botão **Criar 3 demonstrações**. Este botão cria três prestadores pendentes no Supabase, sem documentos reais, para testar o fluxo. Depois da criação, as credenciais temporárias aparecem apenas no próprio painel administrativo; não são gravadas no código. Os prestadores podem ser aprovados no painel e passam a aparecer nas estatísticas e nos cartões públicos.

As demonstrações usam os e-mails `demo.electricista@biscatemz.com`, `demo.psicologo@biscatemz.com` e `demo.costureira@biscatemz.com`, com uma palavra-passe temporária mostrada pelo admin no momento da criação. Não reutilize estas palavras-passe em produção.

## Localização, imagem e rodapé

Esta versão inclui localização opcional no cadastro de prestador e na pesquisa. O navegador pede permissão antes de usar o GPS. A aplicação guarda apenas coordenadas opcionais para ordenar profissionais por proximidade e mostra ao cliente uma distância aproximada em quilómetros; o endereço exato não é mostrado.

Antes de publicar, execute `supabase/migrations/20260903_location.sql` no SQL Editor do mesmo projeto Supabase. Esta migração acrescenta `latitude` e `longitude` opcionais em `provider_profiles` e não elimina dados existentes.

A imagem `public/workers-cutout.png` foi preparada como recorte transparente para o hero. O rodapé contém suporte, direitos de autor, privacidade e data de 2026. A página legal fica em `/direitos-autor`.
