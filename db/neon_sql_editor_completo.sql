-- =============================================================================
-- SprintPro – script único completo para o SQL Editor do Neon
-- =============================================================================
-- Opção 1) Base vazia (projeto novo): cola tudo a partir de "ESQUEMA" e Run.
-- Opção 2) Queres apagar TUDO o que está no `public` e recriar: descomenta o
--          bloco "LIMPEZA TOTAL" abaixo, Run uma vez; depois comenta de novo
--          essas linhas (ou apaga) e executa o resto, OU executa tudo de uma
--          vez (limpeza + esquema) num único Run.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- LIMPEZA TOTAL (opcional) — apaga TODAS as tabelas, tipos e dados em `public`
-- -----------------------------------------------------------------------------
-- Descomente as 4 linhas seguintes se quiseres recomeçar do zero:
--
-- DROP SCHEMA public CASCADE;
-- CREATE SCHEMA public;
-- GRANT ALL ON SCHEMA public TO public;
-- GRANT ALL ON SCHEMA public TO neondb_owner;
--
-- (Se "neondb_owner" der erro de role, apaga a linha do GRANT e deixa só
--  GRANT ALL ON SCHEMA public TO public;)
-- -----------------------------------------------------------------------------


-- =============================================================================
-- ESQUEMA
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUMs: evita 42710 "type already exists" se correres o script outra vez
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('owner', 'member'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE invite_status AS ENUM ('pending', 'accepted'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_status AS ENUM ('todo', 'doing', 'done'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Organização (workspace)
CREATE TABLE IF NOT EXISTS organizations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  owner_id   text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Utilizadores (id = UUID em texto, gerado pela API; password_hash = bcrypt)
CREATE TABLE IF NOT EXISTS users (
  id                text PRIMARY KEY,
  full_name         text NOT NULL,
  email             text NOT NULL,
  organization_id   uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  role              user_role NOT NULL,
  password_hash     text,
  can_favorite      boolean NOT NULL DEFAULT false,
  last_seen_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_org ON users (organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email ON users (email);

-- Quadros
CREATE TABLE IF NOT EXISTS boards (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  name              text NOT NULL,
  featured          boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boards_org ON boards (organization_id);

-- Tarefas
CREATE TABLE IF NOT EXISTS tasks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  board_id          uuid NOT NULL REFERENCES boards (id) ON DELETE CASCADE,
  title             text NOT NULL,
  description       text NOT NULL DEFAULT '',
  status            task_status NOT NULL DEFAULT 'todo',
  label             text,
  priority          task_priority,
  due_date          date,
  assignee_name     text,
  assigned_to       text,
  favorite          boolean NOT NULL DEFAULT false,
  notes             text NOT NULL DEFAULT '',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_board ON tasks (board_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks (organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);

-- Convites
CREATE TABLE IF NOT EXISTS invites (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text NOT NULL,
  organization_id   uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  role              user_role NOT NULL,
  status            invite_status NOT NULL DEFAULT 'pending',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invites_org ON invites (organization_id);
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites (email);

-- Se a tabela `users` for antiga (sem password_hash), acrescenta a coluna
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_favorite boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS favorite boolean NOT NULL DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';

-- Fim. Regista utilizadores e dados só pela aplicação (API), não inserir à mão
-- salvo testes com os INSERT comentados abaixo.
--
-- Exemplo (opcional) — normalmente NÃO usas, o registo é via app:
-- INSERT INTO organizations (name, owner_id) VALUES ('Teste', '00000000-0000-0000-0000-000000000001') RETURNING id;
-- INSERT INTO users (id, full_name, email, organization_id, role, password_hash)
--   VALUES ('00000000-0000-0000-0000-000000000001', 'Teste', 'teste@exemplo.com', '<uuid-da-org-acima>', 'owner', 'hash_bcrypt_aqui');
