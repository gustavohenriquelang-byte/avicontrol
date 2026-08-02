# Avicontrol

Aplicação web para **gestão de granjas de galinhas poedeiras e produção de ovos**.
Simples, responsiva, instalável como PWA e com suporte a lançamentos offline
(planejado para a Etapa 7).

> Status atual: **Etapas 1–4 concluídas** — arquitetura, banco, autenticação,
> multiempresa, layout, permissões, cadastros (empresa, granja, núcleo, aviário,
> lote, linhagem com curva), núcleo operacional (**lançamento diário**, produção,
> mortalidade, **dashboard com gráficos**) e **estoques**: ração com **custo médio
> ponderado** e estoque de ovos com **rastreabilidade** e conversões.
>
> Há um **modo demonstração** (`NEXT_PUBLIC_DEMO_MODE=true`) que ignora o login e
> usa dados fictícios em memória, permitindo navegar toda a interface sem
> configurar o Supabase. Deixe desligado em produção.

---

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS** + componentes no estilo **shadcn/ui**
- **Supabase** (PostgreSQL, Auth, Storage) com **Row Level Security**
- **React Hook Form** + **Zod** (validação)
- **Recharts** (gráficos — a partir da Etapa 3)
- **Lucide Icons**
- **Vitest** (testes de regras de negócio)
- **IndexedDB** (offline — Etapa 7)

---

## Pré-requisitos

- Node.js 20+ (testado em Node 24)
- Um projeto **Supabase** (gratuito serve para desenvolvimento)

---

## Instalação

```bash
npm install
```

Copie o arquivo de variáveis e preencha com as credenciais do seu projeto
Supabase (Supabase → Project Settings → API):

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # apenas no servidor / seed
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Banco de dados

Aplique as migrations (em ordem) no seu projeto Supabase. Você pode:

- Colar o conteúdo de `supabase/migrations/*.sql` no **SQL Editor** do Supabase
  (na ordem `0001_...`, depois `0002_...`), **ou**
- Usar o **Supabase CLI**:

```bash
supabase link --project-ref <ref-do-projeto>
supabase db push
```

As migrations criam as tabelas, as funções auxiliares e as **políticas RLS**
que isolam os dados por organização.

### Dados de demonstração

```bash
npm run db:seed
```

Cria uma empresa, uma granja, 3 aviários, 2 linhagens (com curva), 3 lotes e as
movimentações de entrada. Os 90 dias de produção/mortalidade/ração/vendas serão
incluídos nas Etapas 3–6, quando as tabelas correspondentes existirem.

### Rodar

```bash
npm run dev
```

Acesse http://localhost:3000.

**Usuário de demonstração** (criado pelo seed):

| E-mail                   | Senha           | Perfil        |
| ------------------------ | --------------- | ------------- |
| `admin@avicontrol.local` | `avicontrol123` | Administrador |

---

## Scripts

| Comando             | Descrição                          |
| ------------------- | ---------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento        |
| `npm run build`     | Build de produção                  |
| `npm start`         | Servidor de produção               |
| `npm run lint`      | ESLint                             |
| `npm run typecheck` | Verificação de tipos (`tsc`)       |
| `npm test`          | Testes (Vitest)                    |
| `npm run db:seed`   | Popula dados de demonstração       |

---

## Deploy

1. **Vercel** (recomendado): importe o repositório, configure as variáveis de
   ambiente (as mesmas do `.env.local`) e faça o deploy.
2. Aponte `NEXT_PUBLIC_SITE_URL` para o domínio de produção.
3. No Supabase, em **Authentication → URL Configuration**, adicione a URL do
   site e a URL de redirecionamento `<site>/auth/confirm` (usada na recuperação
   de senha).

---

## Estrutura

```
src/
  app/
    (auth)/            # login, recuperação, seleção de empresa, onboarding
    (app)/             # área autenticada (layout com sidebar + nav mobile)
      configuracoes/   # empresa, granjas, usuários, unidades
      aviarios/        # CRUD de aviários
      lotes/           # CRUD de lotes
      ...              # demais módulos (placeholders por etapa)
    auth/confirm/      # route handler dos links de e-mail
  components/
    ui/                # componentes base (button, card, input, table, ...)
    shell/             # sidebar, nav mobile, topbar
  lib/
    supabase/          # clients (browser/server/middleware) e tipos do banco
    auth/              # contexto de sessão, perfis e permissões
    domain/            # cálculos de negócio (fonte única, testados)
    schemas.ts         # schemas Zod dos formulários
    format.ts          # formatadores pt-BR (moeda, data, percentual)
supabase/
  migrations/          # SQL de schema e RLS
  seed.mjs             # dados de demonstração
```

---

## Regras de negócio (implementadas nesta etapa)

Todas as fórmulas ficam centralizadas em [`src/lib/domain/calculations.ts`](src/lib/domain/calculations.ts)
e são cobertas por testes. **Não duplicar fórmulas em componentes.**

- Taxa de postura, mortalidade diária e acumulada
- Consumo de ração por ave (g/ave/dia), conversão alimentar por dúzia
- Aproveitamento e perdas
- Custo por ovo, custo por dúzia, margem por dúzia, rentabilidade do lote
- Estatística de pesagem (média, desvio, CV, uniformidade ±10%)
- Fechamento de classificação de ovos (soma × total)

### Segurança e permissões

- **RLS** em todas as tabelas: um usuário nunca lê dados de outra organização.
- Permissões por perfil (admin, gerente, operador, veterinário, comercial,
  consulta) verificadas **no servidor** (`requirePermission`) — a interface
  apenas oculta o que o perfil não pode usar.
- Auditoria (`audit_logs`) registra criações, alterações e inativações.
- Cadastros importantes usam **inativação** (soft), não exclusão física.

---

## Mapa de telas

- **Autenticação:** login, recuperar senha, redefinir senha, selecionar empresa,
  onboarding
- **Visão geral:** cards de granjas, aviários, lotes e aves vivas
- **Aviários:** listagem, criação, edição, inativação
- **Lotes:** listagem, criação, edição, inativação (com movimentação de entrada)
- **Configurações:** empresa, granjas, usuários, unidades
- **Demais módulos** (produção, lançamento, ovos, ração, estoque, pesagens,
  sanidade, ambiente, clientes, vendas, financeiro, relatórios, tarefas,
  alertas): placeholders indicando a etapa de entrega

---

## Funcionalidades concluídas (Etapa 1)

- [x] Estrutura do projeto e configuração (Tailwind, PWA manifest, tokens)
- [x] Banco de dados: núcleo multiempresa + RLS + auditoria
- [x] Autenticação (login, recuperação, redefinição, logout, sessão persistente)
- [x] Multiempresa/multigranja com seleção e isolamento por organização
- [x] Perfis e permissões no servidor
- [x] Layout: sidebar recolhível (desktop) e nav inferior com "Lançar" (mobile)
- [x] CRUD de empresa, granja, aviário e lote
- [x] Módulo de cálculos testado
- [x] Seed de demonstração
- [x] lint + typecheck + testes + build passando

## Funcionalidades concluídas (Etapa 2)

- [x] CRUD de **linhagens** (breeds)
- [x] Editor de **curva de linhagem** por semana (postura, peso, consumo) com
      gráfico de referência (Recharts)
- [x] CRUD de **núcleos** (farm_units) por granja
- [x] Seções adicionadas ao hub de Configurações
- [x] Dados de demonstração para linhagens, curva e núcleos

## Funcionalidades concluídas (Etapa 3)

- [x] **Lançamento diário** (`daily_records`): produção + classificação de ovos,
      ração, água, mortalidade e ambiente; fechamento ao vivo (soma × total),
      bloqueio de fechamento com diferença (salvo justificativa de perfil
      autorizado), "repetir ontem", rascunho/fechar, sem duplo fechamento
      (índice único parcial)
- [x] **Produção**: resumo e listagem diária por lote com indicadores
- [x] **Mortalidade** (`mortality_records`): registro com motivos e histórico
- [x] **Dashboard**: cards do dia + gráficos (produção, postura, mortalidade,
      ração) com filtro de 7/30/90 dias (Recharts)
- [x] Migration `0003` + RLS (operador escreve lançamentos), 90 dias de dados demo
- [x] Testes de fechamento diário e métricas (28 testes no total)

## Funcionalidades concluídas (Etapa 4)

- [x] **Ração**: tipos de ração, **registro de compra** atualizando o estoque por
      **custo médio ponderado**, visão de estoque, movimentações e **dias de
      estoque** (a partir do consumo médio)
- [x] **Estoque de ovos**: lotes com **código de rastreabilidade**
      (`OVO-AAAA-MM-DD-Gxx-Lyy-NNN`), qualidade, categoria de peso, validade e
      movimentações
- [x] **Conversões** configuráveis (unidade, dúzia, bandeja, caixa, kg)
- [x] Migration `0004` (feed_types, feed_purchases, feed_inventory,
      feed_movements, egg_inventory, egg_inventory_movements) + RLS
- [x] Testes de custo médio ponderado e conversões (37 testes no total)

## Módulo Esterco (receita adicional)

- [x] **Esterco / cama de aviário** (`/esterco`): produção/estoque e **venda de
      esterco como receita**, com unidades (kg, tonelada, saco, big bag, m³),
      conversão para kg, receita do mês/acumulada e saldo em estoque
- [x] Migration `0005` (`manure_production`, `manure_sales`) + RLS; módulo de
      permissão `esterco`; item de menu próprio

## Próximas etapas

- **Etapa 5:** pesagens, sanidade, ambiente, alertas, tarefas
- **Etapa 4:** estoque de ovos, estoque de ração, classificação
- **Etapa 5:** pesagens, sanidade, ambiente, alertas, tarefas
- **Etapa 6:** clientes, vendas, financeiro
- **Etapa 7:** relatórios, PWA offline (IndexedDB + sincronização), documentação

---

## Notas

- Os ícones PWA (`public/icons/icon-192.png` e `icon-512.png`) devem ser
  adicionados para instalação completa como app.
- Para regenerar os tipos do banco após alterar o schema:
  `npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts`
