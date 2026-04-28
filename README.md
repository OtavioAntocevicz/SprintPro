# SprintPro

Plataforma SaaS de gestão de tarefas com foco em produtividade real de times.
O `SprintPro` combina Kanban com permissões por organização, convites de equipe, relatórios e configurações avançadas em uma experiência leve, moderna e pronta para produção.

## Por que o SprintPro chama atenção

- Fluxo completo de trabalho: cadastro, login, convites, criação de tarefas, acompanhamento e gestão de equipe.
- Arquitetura desacoplada: frontend em React e backend API próprio em Node.js/Express.
- Banco robusto em PostgreSQL (Neon) com modelagem multi-tenant.
- Permissões reais por papel (`owner` e `member`) com regras de negócio no backend.
- UI fluida com drag and drop no Kanban e feedback de ações em tempo real por polling.
- PWA habilitado para experiência semelhante a app.

## Principais funcionalidades

### Autenticação e organização
- Cadastro de gestor com criação automática da organização.
- Login com JWT (token no cliente e validação no backend).
- Fluxo de convite para colaboradores (`/accept-invite`).
- Controle multi-tenant por `organizationId`.

### Gestão de tarefas
- Quadro Kanban com colunas `A fazer`, `Em progresso`, `Concluído`.
- Drag and drop entre colunas.
- Criação de tarefa com:
  - título e descrição
  - categoria e prioridade
  - prazo
  - responsável via seletor de membros
- Favoritar tarefa com permissão controlada.
- Exclusão de tarefa concluída (apenas gestor).

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

## Segurança e boas práticas implementadas

- Senha forte obrigatória (mínimo 8 caracteres com letras e números).
- Hash de senha com `bcrypt`.
- Validação de sessão JWT em rotas protegidas.
- Rate limit em rotas sensíveis de autenticação.
- Headers básicos de segurança HTTP.
- Logs de requisição com `requestId`.
- Restrições de permissão sensíveis no backend (não apenas no frontend).

## Arquitetura do projeto

```text
SprintPro/
├─ api/                     # API Express + integração Neon
├─ db/                      # SQL do schema/migrations consolidadas
├─ src/
│  ├─ components/           # Componentes reutilizáveis
│  ├─ hooks/                # Hooks de dados e estado
│  ├─ pages/                # Páginas de rota
│  ├─ services/             # Camada de acesso à API
│  ├─ store/                # Estado global (auth etc.)
│  ├─ types/                # Tipagens compartilhadas
│  └─ utils/                # Helpers utilitários
└─ README.md
```

## Como rodar localmente

### 1) Pré-requisitos
- Node.js 20+
- Conta Neon com banco PostgreSQL criado

### 2) Variáveis de ambiente
Copie `.env.example` para `.env` e configure:

```bash
DATABASE_URL=postgresql://...
JWT_SECRET=coloque-um-segredo-forte-aqui
VITE_API_URL=http://127.0.0.1:8787
```

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

## Scripts úteis

- `npm run dev` -> sobe apenas o frontend.
- `npm run api` -> sobe a API em modo watch.
- `npm run dev:all` -> sobe API + frontend juntos.
- `npm run build` -> build de produção do frontend.
- `npm run lint` -> análise estática com ESLint.

## Endpoints de referência (API)

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/register-invite`
- `GET /api/me`
- `GET /api/boards`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `GET /api/organization/members`
- `PATCH /api/organization/members/:memberId/favorite-permission`
- `GET /api/presence/online`
- `PATCH /api/settings/profile`
- `PATCH /api/settings/organization`
- `POST /api/settings/change-password`
- `DELETE /api/settings/account`

## Status do produto

Versão MVP funcional, com base sólida para escalar em novos módulos como notificações, auditoria avançada, integrações externas e analytics operacional.

---

Se você chegou até aqui: o SprintPro não é só um board de tarefas.  
É uma base pronta para operar times de verdade com segurança, clareza e velocidade.
