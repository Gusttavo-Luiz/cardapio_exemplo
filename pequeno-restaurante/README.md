# Cardápio digital — Pequeno Restaurante

Cardápio digital do Pequeno Restaurante (Rua Amazonas, 26 — Bom Retiro, São Paulo). O cliente consulta os pratos, monta o pedido e envia pelo WhatsApp, sem instalar aplicativo nem criar conta. O proprietário atualiza pratos, preços, fotos e disponibilidade por um painel com login.

Endereço previsto: https://gusttavo-luiz.github.io/cardapio_exemplo/pequeno-restaurante/
Painel: https://gusttavo-luiz.github.io/cardapio_exemplo/pequeno-restaurante/admin/

> **Antes de divulgar**, confira [PENDENCIAS.md](PENDENCIAS.md): a lista de informações comerciais que ainda dependem de confirmação do proprietário. O painel mostra a mesma lista na aba **Início**.

## Como funciona

| Parte | O que faz |
| --- | --- |
| Cardápio (`/`) | Capa, prato do dia, busca, categorias, detalhes do prato, carrinho e envio do pedido pelo WhatsApp. |
| Painel (`/admin/`) | Login do administrador; pratos, categorias, informações do restaurante, entrega, QR Code e lista de pendências. |
| Privacidade (`/privacidade/`) | Política de privacidade que descreve o que o site faz com os dados. |
| Banco (Supabase) | Pratos, categorias e configurações (PostgreSQL com permissões por linha), login do administrador e armazenamento das fotos. |

Tecnologia: React + TypeScript, Tailwind CSS, Vite, Supabase. As fontes (Lora e DM Sans) vão junto com o site, sem depender do Google Fonts.

### Modo de demonstração

Enquanto o arquivo `public/config.js` não tiver os dados do Supabase, o cardápio mostra **conteúdo de teste**: uma faixa amarela no topo e a etiqueta “Conteúdo de teste” em cada prato avisam que nada ali é o cardápio real. Nesse modo:

- o botão de envio pelo WhatsApp fica desativado (a mensagem pode ser conferida e copiada);
- o site pede para não ser indexado por buscadores;
- o painel publicado mostra “Painel ainda não configurado”. Só no servidor de desenvolvimento (`npm run dev`) há um painel local, que grava no próprio navegador, para testes.

### Regras que o site segue

- Informações não confirmadas no painel aparecem com o aviso **“a confirmar”** e ficam fora dos dados estruturados para o Google.
- O botão **Enviar pelo WhatsApp** só funciona depois que o proprietário marcar “Confirmo que este número recebe pedidos pelo WhatsApp”.
- **Retirada** e **entrega** só aparecem no pedido depois que o atendimento for confirmado.
- A taxa de entrega só entra no total quando estiver cadastrada. Sem taxa cadastrada, a mensagem diz “Taxa de entrega: a ser informada pelo restaurante”.
- A mensagem termina com “Aguardo a confirmação do restaurante”, e o site avisa que o pedido só é confirmado quando o restaurante responder e que abrir o WhatsApp não envia a mensagem sozinho.
- Antes de abrir o WhatsApp, o carrinho é conferido de novo com o cardápio: preços atualizados são avisados, e itens indisponíveis ou retirados precisam ser removidos.
- O carrinho fica salvo no navegador por até 12 horas. Endereço e nome não são gravados; vão apenas na mensagem do WhatsApp.
- Fotos marcadas como provisórias aparecem com a etiqueta **“Imagem ilustrativa”**. Pratos sem foto mostram “Foto em breve”.

## Colocar no ar (passo a passo)

### 1. Criar o banco no Supabase

1. Crie uma conta em https://supabase.com e um projeto novo (região **South America (São Paulo)**).
2. Abra **SQL Editor**, cole o conteúdo de [`supabase/migrations/20261023000000_cardapio.sql`](supabase/migrations/20261023000000_cardapio.sql) e clique em **Run**. Isso cria as tabelas, as permissões, o espaço das fotos e os dados iniciais: o endereço, o telefone e o horário divulgados, todos marcados como “a confirmar”, e as categorias sugeridas, sem nenhum prato.
3. Em **Authentication → Sign In / Providers**, desative **Allow new users to sign up**. Assim ninguém consegue criar conta pelo site.

### 2. Criar o login do administrador

1. Em **Authentication → Users → Add user → Create new user**, informe o e-mail do proprietário e uma senha forte, com **Auto Confirm User** marcado.
2. No **SQL Editor**, dê a esse usuário a permissão de administrador (troque o e-mail):

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'email-do-proprietario@exemplo.com';
   ```

   Repita para outras pessoas que devem editar o cardápio. Para tirar o acesso de alguém: `delete from public.admins where user_id = (select id from auth.users where email = '...');`
3. Em **Authentication → URL Configuration**, coloque em **Site URL** e em **Redirect URLs** o endereço do painel (`https://gusttavo-luiz.github.io/cardapio_exemplo/pequeno-restaurante/admin/`). É para onde leva o link de “Esqueci minha senha”.

### 3. Ligar o site ao banco

Em **Project Settings → API Keys** (ou **API**), copie a **Project URL** e a chave **publishable** (`sb_publishable_...`; em projetos antigos, a chave `anon`). Edite [`public/config.js`](public/config.js):

```js
window.CARDAPIO_CONFIG = {
  supabaseUrl: "https://SEU-PROJETO.supabase.co",
  supabaseKey: "sb_publishable_...",
  publicUrl: "https://gusttavo-luiz.github.io/cardapio_exemplo/pequeno-restaurante/",
};
```

A chave publishable é pública por natureza: o que protege os dados são as permissões do banco (só administradores alteram algo, e os testes em `tests/sql` verificam isso). **Nunca** coloque no `config.js` a chave secreta (`sb_secret_...` ou `service_role`). Se isso acontecer, o site se recusa a abrir e você deve gerar uma chave secreta nova no Supabase.

### 4. Publicar no GitHub Pages

O workflow [`.github/workflows/pequeno-restaurante.yml`](../.github/workflows/pequeno-restaurante.yml) testa o projeto em todo pull request e, a cada alteração na `main`, publica o site inteiro: o cardápio Bardock continua na raiz e este fica em `/pequeno-restaurante/`.

Uma única vez, em **Settings → Pages → Build and deployment → Source**, troque “Deploy from a branch” por **GitHub Actions**. Enquanto essa opção não for trocada, a etapa de publicação do workflow falha e o endereço `/pequeno-restaurante/` não funciona.

### 5. Preencher e conferir

1. Entre no painel e resolva os itens da aba **Início**.
2. Cadastre os pratos reais na aba **Pratos**. Um prato novo começa como “não publicado”: use **Visualizar prévia** para conferir antes de publicar.
3. Na aba **QR Code**, imprima a plaquinha de mesa ou baixe o QR em PNG ou SVG. Também há um PNG pronto em [`../qrcode/pequeno-restaurante-qrcode.png`](../qrcode/pequeno-restaurante-qrcode.png). Teste com alguns celulares antes de imprimir em quantidade.

## Uso diário do painel

- **Pratos**: criar, editar, excluir; preço no formato `25,90`; variações ou tamanhos com preço próprio; foto (reduzida automaticamente antes do envio); interruptores **Disponível** (esgotado hoje) e **Publicado** (aparece no cardápio); estrela **Prato do dia** (sem prato do dia, a seção some).
- **Categorias**: criar, renomear, reordenar, desativar ou excluir. O cardápio só mostra categorias ativas que têm pratos publicados.
- **Restaurante**: nome, frases da capa, foto de capa, endereço, telefone, WhatsApp, Instagram, horários, atendimento, formas de pagamento e responsável pelos dados. Cada grupo tem a caixa “Informação confirmada pelo restaurante”.
- **Entrega**: sem taxa, taxa única ou taxa por região.

## Desenvolvimento

```bash
cd pequeno-restaurante
npm install
npm run dev          # http://localhost:5173 (cardápio) e /admin/ (painel local de teste)
npm run typecheck
npm test             # testes de unidade: carrinho, valores, mensagem do WhatsApp, validações
npm run test:sql     # aplica a migração num PostgreSQL temporário e testa as permissões
npm run test:e2e     # testes no navegador (celular e computador), incluindo acessibilidade
npm run build        # gera a pasta dist/
```

`test:sql` precisa do PostgreSQL instalado (`initdb`, `pg_ctl`, `psql`). `test:e2e` usa o Chromium do Playwright (`npx playwright install chromium`).

### Estrutura

```
index.html, admin/index.html, privacidade/index.html   páginas (SEO e metadados no index.html)
public/config.js          endereço do Supabase (editável sem recompilar)
src/public/               cardápio: capa, busca, categorias, cartões, detalhes, carrinho, finalização
src/admin/                painel: login, pratos, categorias, restaurante, entrega, QR Code, pendências
src/lib/                  regras sem interface: dinheiro, carrinho, pedido/WhatsApp, validação, horários
src/data/                 acesso aos dados: leitura leve via REST, Supabase completo no painel, demonstração
supabase/migrations/      tabelas, permissões (RLS), validações no banco e dados iniciais
tests/                    unit (Vitest), e2e (Playwright), sql (permissões no PostgreSQL)
```

O cardápio público lê o banco direto pela API REST, sem a biblioteca do Supabase (que só é baixada no painel e na prévia), para abrir rápido mesmo em conexão móvel lenta.
