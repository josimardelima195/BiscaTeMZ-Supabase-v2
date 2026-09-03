# BiscaTeMZ — versão Supabase

Aplicação pronta para Vercel com uma única plataforma de dados: **Supabase** (Postgres + autenticação + armazenamento). Não usa Firebase nem Google Drive.

## O que já funciona

- Cliente cria conta e entra como cliente ou prestador.
- Prestador cria a conta **sem login anterior**, tira/escolhe foto de perfil, envia BI frente/verso e certificado opcional.
- A foto fica pública no perfil; BI e documentos ficam privados e só o administrador vê no painel.
- Administrador aprova ou recusa em `/admin`; só prestadores aprovados aparecem publicamente.
- Perfil público apresenta foto, categoria, habilitações, serviços concluídos e classificação.
- Pedido de serviço, notificação interna, aceitação, chat privado, conclusão e avaliação de 1–5 estrelas.
- SOS regista o alerta, permite partilhar localização e abre a chamada para `112` no dispositivo.

> SOS não envia SMS nem aciona automaticamente polícia/família: isso exigiria um fornecedor de SMS, contratos e consentimento dos contactos. Trate esta função como apoio, nunca como substituto de serviços de emergência.

## Publicar em cerca de 15 minutos

### 1. Criar a base de dados

1. Abra [Supabase](https://database.new), entre com a sua conta e escolha **New project**.
2. Quando o projeto terminar, abra **SQL Editor** > **New query**.
3. Abra o ficheiro `supabase/schema.sql` deste projeto, copie tudo, cole e carregue em **Run**. Isto cria tabelas, permissões e os dois buckets de fotos/documentos.
4. Abra **Project Settings** > **API** e copie:
   - Project URL
   - Publishable key
   - Secret key (nunca publique esta chave)

### 2. Subir para GitHub

1. Crie um repositório vazio em [GitHub](https://github.com/new), por exemplo `BiscaTeMZ-Supabase`.
2. Extraia o ZIP e envie **os ficheiros dentro da pasta** para o repositório. Não envie `node_modules`, `.next`, `.npm-cache` nem ficheiros `.env`.

### 3. Importar na Vercel

1. Abra [Vercel](https://vercel.com/new), selecione o repositório GitHub e clique em **Deploy**.
2. Antes de publicar, em **Environment Variables**, crie estas quatro variáveis:

```text
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
NEXT_PUBLIC_SITE_URL=https://coloque-depois-o-endereco-da-vercel
```

3. Faça o primeiro Deploy. Copie o endereço `https://....vercel.app` e atualize `NEXT_PUBLIC_SITE_URL`; depois faça **Redeploy**.

### 4. Criar o primeiro administrador

1. No site Vercel, crie uma conta normal de cliente e entre uma vez.
2. No Supabase, abra **Authentication** > **Users**, copie o UUID desse utilizador.
3. No SQL Editor, execute, trocando o UUID:

```sql
update public.profiles set role='admin' where id='COLE-O-UUID-AQUI';
```

4. Entre em `https://SEU-SITE.vercel.app/admin`. A partir daí, pode abrir documentos privados e aprovar/rejeitar prestadores.

## Domínio próprio

Na Vercel: **Project > Settings > Domains > Add**. Depois atualize `NEXT_PUBLIC_SITE_URL` com o domínio e redeploy. No Supabase, em **Authentication > URL Configuration**, coloque esse mesmo endereço em **Site URL** e em **Redirect URLs**.

## Como os dados ficam guardados

- `auth.users`: e-mail e palavra-passe (a palavra-passe nunca fica visível no site ou na base de dados).
- `profiles` e `provider_profiles`: conta, fotografia, dados públicos, confiança e estatísticas.
- `provider_documents`: apenas o caminho do ficheiro; ficheiros de BI ficam no bucket privado `private-documents`.
- `profile-photos`: fotos de perfil públicas.
- `service_requests`, `conversations`, `messages`, `notifications`, `reviews` e `sos_alerts`: operações da plataforma.

As regras RLS do SQL bloqueiam acesso direto indevido. A chave `SUPABASE_SECRET_KEY` fica apenas na Vercel para criar contas e guardar documentos; jamais a copie para código do navegador, GitHub ou chat.

## Desenvolvimento local (opcional)

```bash
copy .env.example .env.local
npm install
npm run dev
```

Preencha `.env.local` com as mesmas quatro variáveis da Vercel e abra `http://localhost:3000`.
