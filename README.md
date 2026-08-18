# SprintPro

Plataforma SaaS de gestão de tarefas com foco em produtividade real de times.
O `SprintPro` combina Kanban com permissões por organização, convites de equipe, relatórios e configurações avançadas em uma experiência leve, moderna e pronta para produção.

## Por que o SprintPro chama atenção

- Fluxo completo de trabalho: cadastro, login, convites, criação de tarefas, acompanhamento e gestão de equipe.
- Arquitetura desacoplada: frontend em React e backend API próprio em Node.js/Express.
- Banco robusto em PostgreSQL (Neon) com modelagem multi-tenant.
- Permissões reais por papel (`owner` e `member`) com regras de negócio no backend.
- UI fluida com drag and drop no Kanban, filtros avançados e feedback em tempo real por polling.
- PWA habilitado para experiência semelhante a app.
- Modo claro/escuro com persistência no navegador.

## Principais funcionalidades

### Autenticação e organização
- Cadastro de gestor com criação automática da organização.
- Login com JWT (token no cliente e validação no backend).
- Recuperação de senha (`/forgot-password` e `/reset-password`).
- Fluxo de convite para colaboradores (`/accept-invite` e `/join`).
- Controle multi-tenant por `organizationId`.

### Dashboard
- Visão geral com tarefas favoritas, estatísticas da organização e atalhos para quadros.

### Gestão de tarefas
- Quadro Kanban com colunas `A fazer`, `Em progresso`, `Concluído`.
- Drag and drop entre colunas.
- Criação de tarefa com:
  - título e descrição
  - categoria e prioridade
  - prazo
  - responsável via seletor de membros
- Edição de tarefa (modal com descrição, categoria, prioridade, prazo e responsável).
- Anotações por tarefa (criar, listar e excluir).
- Favoritar tarefa com permissão controlada.
- Filtros no quadro: busca, categoria, responsável, prazo, prioridade e ordenação.
- Tarefas concluídas permanecem visíveis no board por 24h; histórico completo em **Concluídos**.
- Exclusão de tarefa concluída (apenas gestor).

### Página Concluídos
- Histórico de tarefas finalizadas da organização.
- Filtros por busca, categoria e presença de anotações.
- Ordenação por data de conclusão ou título.
- Visualização de anotações e exclusão (gestor).

### Equipe, permissões e presença
- Página de membros com:
  - status online/offline
  - último acesso
  - convites pendentes
- Permissão de favoritar por colaborador (`can_favorite`).
- Remoção de membro (somente gestor).
- Sistema de presença com heartbeat (`/api/presence/heartbeat` e `/api/presence/online`).

### Relatórios e configurações
- Relatórios com filtros por período (`7d`, `30d`, `90d`, `all`).
- Indicadores de tarefas por status e por responsável.
- Configurações com seções:
  - Perfil
  - Organização
  - Categorias de tarefa (CRUD — somente gestor)
  - Equipe e permissões
  - Segurança (alterar senha, encerrar sessão, excluir conta principal)

## Stack tecnológica

### Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- React Router
- `@dnd-kit` (drag and drop)
- `vite-plugin-pwa`

### Backend
- Node.js
- Express
- JWT (`jsonwebtoken`)
- `bcryptjs`
- `@neondatabase/serverless` + `ws`
- CORS + dotenv

### Banco de dados
- PostgreSQL no Neon
- Script SQL consolidado em `db/neon_sql_editor_completo.sql`

### Deploy
- Vercel (frontend estático + API serverless no mesmo projeto)
- Configuração em `vercel.json`

## Segurança e boas práticas implementadas

- Senha forte obrigatória (mínimo 8 caracteres com letras e números).
- Hash de senha com `bcrypt`.
- Validação de sessão JWT em rotas protegidas.
- Rate limit em rotas sensíveis de autenticação.
- Headers básicos de seguridade HTTP.
- Logs de requisição com `requestId`.
- Restrições de permissão sensíveis no backend (não apenas no frontend).

## Arquitetura do projeto

```text
SprintPro/
├─ api/                     # API Express + integração Neon
│  ├─ app.mjs               # Rotas e lógica principal
│  ├─ index.mjs             # Entry point serverless (Vercel)
│  └─ reset-password.mjs    # Script CLI para reset manual de senha
├─ db/                      # SQL do schema/migrations consolidadas
├─ src/
│  ├─ components/           # Componentes reutilizáveis
│  ├─ hooks/                # Hooks de dados e estado
│  ├─ pages/                # Páginas de rota
│  ├─ services/             # Camada de acesso à API
│  ├─ store/                # Estado global (auth, tema, sidebar etc.)
│  ├─ types/                # Tipagens compartilhadas
│  └─ utils/                # Helpers utilitários
├─ vercel.json              # Build, rewrites e functions na Vercel
└─ README.md
```

## Como rodar localmente

### 1) Pré-requisitos
- Node.js 20+
- Conta Neon com banco PostgreSQL criado

### 2) Variáveis de ambiente
Copie `.env.example` para `.env` (ou `.env.local`) na raiz do projeto:

```bash
DATABASE_URL=postgresql://...
JWT_SECRET=coloque-um-segredo-forte-aqui
API_PORT=8787
VITE_API_URL=http://127.0.0.1:8787
```

Em desenvolvimento, o Vite faz proxy de `/api` para a API local (`127.0.0.1:8787`).

**Recuperação de senha (temporário, sem Resend):**

Enquanto o envio por e-mail não estiver configurado, use uma das opções:

```bash
# Opção 1: script CLI (direto no banco)
npm run reset-password -- voce@empresa.com NovaSenha1

# Opção 2: exibir link na tela e no log da API
SHOW_PASSWORD_RESET_LINK=true
APP_URL=http://localhost:5173
```

> Remova `SHOW_PASSWORD_RESET_LINK` quando integrar o Resend em produção.

### 3) Instalar dependências

```bash
npm install
npm install --prefix api
```

### 4) Subir schema no Neon
Execute o conteúdo de `db/neon_sql_editor_completo.sql` no SQL Editor do Neon.

### 5) Rodar aplicação completa (API + WEB)

```bash
npm run dev:all
```

Frontend: `http://localhost:5173`  
API: `http://127.0.0.1:8787`

## Deploy na Vercel

O projeto usa frontend e API no **mesmo repositório**. O `vercel.json` roteia `/api/*` para a function serverless.

**Variáveis obrigatórias no painel Vercel:**

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Connection string do Neon |
| `JWT_SECRET` | Segredo JWT (mín. 16 caracteres) |

**Opcionais:**

| Variável | Descrição |
|----------|-----------|
| `SHOW_PASSWORD_RESET_LINK` | `true` — exibe link de reset na tela (temporário) |
| `APP_URL` | URL pública do app (ex. `https://seu-app.vercel.app`) |

Não é necessário definir `VITE_API_URL` em produção — o frontend usa `/api` no mesmo domínio.

Após alterar variáveis, faça **Redeploy**.

## Scripts úteis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Sobe apenas o frontend |
| `npm run api` | Sobe a API em modo watch |
| `npm run api:start` | Sobe a API sem watch |
| `npm run dev:all` | Sobe API + frontend juntos |
| `npm run build` | Build de produção do frontend |
| `npm run preview` | Preview local do build |
| `npm run lint` | Análise estática com ESLint |
| `npm run reset-password -- email senha` | Reset manual de senha no banco |

## Rotas do frontend

| Rota | Descrição |
|------|-----------|
| `/` | Landing page |
| `/login` | Login e cadastro |
| `/forgot-password` | Solicitar recuperação de senha |
| `/reset-password` | Redefinir senha com token |
| `/accept-invite`, `/join` | Aceitar convite |
| `/dashboard` | Dashboard (autenticado) |
| `/boards` | Quadro Kanban (autenticado) |
| `/completed` | Histórico de concluídas (autenticado) |
| `/members` | Membros e convites (autenticado) |
| `/reports` | Relatórios (autenticado) |
| `/settings` | Configurações (autenticado) |

## Endpoints da API

### Saúde
- `GET /api/health`
- `GET /api/health/db`

### Autenticação
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/register-invite`

### Sessão e perfil
- `GET /api/me`
- `PATCH /api/settings/profile`
- `PATCH /api/settings/organization`
- `POST /api/settings/change-password`
- `DELETE /api/settings/account`

### Boards e tarefas
- `GET /api/boards`
- `POST /api/boards`
- `PATCH /api/boards/:id/featured`
- `GET /api/boards/:boardId/tasks`
- `GET /api/organization/tasks`
- `GET /api/organization/completed-tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`

### Anotações de tarefa
- `GET /api/tasks/:id/notes`
- `POST /api/tasks/:id/notes`
- `DELETE /api/tasks/:id/notes/:noteId`

### Organização
- `GET /api/organization/members`
- `PATCH /api/organization/members/:memberId/favorite-permission`
- `DELETE /api/organization/members/:memberId`
- `GET /api/organization/invites`
- `POST /api/invites`
- `GET /api/organization/categories`
- `POST /api/organization/categories`
- `PATCH /api/organization/categories/:id`
- `DELETE /api/organization/categories/:id`

### Presença
- `POST /api/presence/heartbeat`
- `GET /api/presence/online`

## Status do produto

Versão MVP funcional, com base sólida para escalar em novos módulos como notificações por e-mail (Resend), auditoria avançada, integrações externas e analytics operacional.

---

Se você chegou até aqui: o SprintPro não é só um board de tarefas.  
É uma base pronta para operar times de verdade com segurança, clareza e velocidade.
