# Como colocar o Avicontrol no ar (passo a passo para leigos)

Você vai usar **dois serviços gratuitos**:

- **Supabase** — banco de dados e login (plano Free, R$ 0)
- **Vercel** — hospeda o site (plano Hobby, R$ 0)

Tempo estimado: ~30 a 45 minutos. Não precisa saber programar.

> Dica: faça em um computador, com calma. Deixe esta página aberta ao lado.

---

## Parte 1 — Subir o código para o GitHub

O GitHub guarda o código; a Vercel lê de lá para publicar.

1. Crie uma conta em **https://github.com** (grátis).
2. Clique no **+** (canto superior direito) → **New repository**.
   - **Repository name:** `avicontrol`
   - Marque **Private** (privado).
   - Clique **Create repository**.
3. Suba o código. Peça para o Claude Code rodar isto por você (ele já deixa o
   projeto pronto), ou rode no terminal, dentro da pasta `avicontrol`:

```bash
git init
git add .
git commit -m "Avicontrol - primeira versão"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/avicontrol.git
git push -u origin main
```

Troque `SEU_USUARIO` pelo seu nome de usuário do GitHub. Ele vai pedir login.

---

## Parte 2 — Criar o banco de dados (Supabase)

1. Crie conta em **https://supabase.com** → **New project**.
   - **Name:** `avicontrol`
   - **Database Password:** crie uma senha forte e **guarde** (anote).
   - **Region:** escolha **South America (São Paulo)**.
   - Clique **Create new project** e aguarde ~2 minutos.
2. No menu lateral, abra **SQL Editor** → **New query**.
3. Abra o arquivo **`supabase/schema_completo.sql`** (está na pasta do projeto),
   copie **tudo**, cole no editor e clique em **Run**. Isso cria todas as
   tabelas e as regras de segurança.
4. Pegue as chaves: menu **Project Settings** (engrenagem) → **API**. Anote:
   - **Project URL** (algo como `https://xxxx.supabase.co`)
   - **anon public** (uma chave longa)
   - **service_role** (outra chave longa — **secreta**, nunca compartilhe)
5. Configure o login: menu **Authentication** → **Providers** → **Email**.
   - Para facilitar no começo, **desligue** "Confirm email" (assim você já entra
     sem precisar confirmar e-mail). Depois pode religar.
6. Ainda em **Authentication** → **URL Configuration**: em **Site URL** coloque
   (por enquanto) `http://localhost:3000`. Você volta aqui no fim para trocar
   pelo endereço da Vercel.

---

## Parte 3 — Publicar o site (Vercel)

1. Crie conta em **https://vercel.com** usando **Continue with GitHub**.
2. Clique **Add New… → Project** e escolha o repositório `avicontrol` → **Import**.
3. Em **Environment Variables**, adicione estas 4 (Name = Value):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | a *Project URL* do Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | a chave *anon public* |
   | `SUPABASE_SERVICE_ROLE_KEY` | a chave *service_role* |
   | `NEXT_PUBLIC_SITE_URL` | deixe em branco por ora; ajuste no passo 6 |

   > **Importante:** NÃO crie a variável `NEXT_PUBLIC_DEMO_MODE`. Ela é só para
   > testes locais; em produção o sistema precisa do login real.

4. Clique **Deploy** e aguarde alguns minutos.
5. A Vercel te dá um endereço, tipo **`https://avicontrol-xxxx.vercel.app`**.
   Esse é o seu sistema no ar!
6. Volte no **Supabase → Authentication → URL Configuration** e ajuste:
   - **Site URL:** o endereço da Vercel.
   - **Redirect URLs:** adicione `SEU_ENDERECO/auth/confirm`.
   Depois, na Vercel, edite a variável `NEXT_PUBLIC_SITE_URL` com o endereço da
   Vercel e clique em **Redeploy**.

---

## Parte 4 — Primeiro acesso

1. Abra o endereço da Vercel → você cai na tela de **login**.
2. Como ainda não há usuário, crie um pela tela do Supabase:
   **Authentication → Users → Add user** (e-mail e senha).
3. Volte no site, faça login. Na primeira vez o sistema pede para **criar sua
   empresa** (onboarding). Pronto — a partir daí você cadastra granjas,
   aviários, lotes e começa os lançamentos.

> Quer já entrar com dados de exemplo? Peça ao Claude Code para rodar o
> **seed** apontando para o seu Supabase (ele usa a chave service_role).

---

## Custos, na prática

- **Começar: R$ 0/mês.** Uma granja cabe folgado no plano gratuito dos dois.
- **Domínio próprio** (ex.: `suagranja.com.br`): ~R$ 40/ano no **registro.br**;
  depois é só apontar na Vercel (**Settings → Domains**).
- **Se crescer muito** (muitos usuários/uso): Supabase Pro ~US$ 25/mês e Vercel
  Pro ~US$ 20/mês. Só quando o gratuito apertar — o sistema avisa nos painéis.

## Observações

- No plano Free, o banco do Supabase "hiberna" após ~1 semana **sem nenhum
  acesso**. Com uso diário isso não acontece.
- Toda vez que você (ou o Claude Code) atualizar o código no GitHub, a Vercel
  **republica sozinha**. Não precisa mexer em nada.
- Guarde a senha do banco e a chave `service_role` em local seguro.
