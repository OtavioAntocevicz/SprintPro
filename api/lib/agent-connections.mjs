import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'

const MAX_CONNECTIONS_PER_USER = 20

export function mapAgentConnection(row) {
  return {
    id: String(row.id),
    label: row.label,
    active: Boolean(row.active),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    lastUsedAt: row.last_used_at
      ? row.last_used_at instanceof Date
        ? row.last_used_at.toISOString()
        : String(row.last_used_at)
      : undefined,
    revokedAt: row.revoked_at
      ? row.revoked_at instanceof Date
        ? row.revoked_at.toISOString()
        : String(row.revoked_at)
      : undefined,
  }
}

export async function ensureAgentConnectionsSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS agent_connections (
      id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id           text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      organization_id   uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
      label             text NOT NULL,
      active            boolean NOT NULL DEFAULT true,
      created_at        timestamptz NOT NULL DEFAULT now(),
      last_used_at      timestamptz,
      revoked_at        timestamptz
    );
  `)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_agent_connections_user ON agent_connections (user_id);
  `)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_agent_connections_org ON agent_connections (organization_id);
  `)
  await pool.query(`
    ALTER TABLE agent_connections
    ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 0;
  `)
}

export function buildAgentToken(jwtSecret, userRow, connectionId, connectionTokenVersion = 0) {
  return jwt.sign(
    {
      sub: userRow.id,
      email: userRow.email,
      orgId: String(userRow.organization_id),
      role: userRow.role,
      tv: Number(userRow.token_version ?? 0),
      typ: 'agent',
      acId: connectionId,
      acTv: Number(connectionTokenVersion ?? 0),
    },
    jwtSecret,
    { expiresIn: '365d' },
  )
}

export async function createAgentConnection(pool, jwtSecret, userRow, label) {
  const cleanLabel = String(label ?? '').trim() || 'Conexão MCP'
  const { rows: countRows } = await pool.query(
    'SELECT COUNT(*)::int AS total FROM agent_connections WHERE user_id = $1',
    [userRow.id],
  )
  if (Number(countRows[0]?.total ?? 0) >= MAX_CONNECTIONS_PER_USER) {
    return { error: `Limite de ${MAX_CONNECTIONS_PER_USER} conexões MCP por usuário.` }
  }
  const connectionId = randomUUID()
  const { rows } = await pool.query(
    `INSERT INTO agent_connections (id, user_id, organization_id, label, active, token_version)
     VALUES ($1, $2, $3, $4, true, 0)
     RETURNING *`,
    [connectionId, userRow.id, userRow.organization_id, cleanLabel],
  )
  const token = buildAgentToken(jwtSecret, userRow, connectionId, rows[0].token_version)
  return { connection: mapAgentConnection(rows[0]), token }
}

export async function regenerateAgentConnectionToken(pool, jwtSecret, userRow, connectionId) {
  const { rows } = await pool.query(
    `UPDATE agent_connections
     SET token_version = token_version + 1,
         active = true,
         revoked_at = NULL
     WHERE id = $1 AND user_id = $2 AND organization_id = $3::uuid
     RETURNING *`,
    [connectionId, userRow.id, String(userRow.organization_id)],
  )
  if (!rows[0]) return { error: 'Conexão não encontrada.' }
  const token = buildAgentToken(jwtSecret, userRow, connectionId, rows[0].token_version)
  return { connection: mapAgentConnection(rows[0]), token }
}

export async function validateAgentConnection(pool, payload) {
  if (payload.typ !== 'agent' || !payload.acId) {
    return true
  }
  const tokenAcTv = Number(payload.acTv ?? 0)
  const { rows } = await pool.query(
    `UPDATE agent_connections
     SET last_used_at = now()
     WHERE id = $1 AND user_id = $2 AND organization_id = $3::uuid
       AND active = true AND revoked_at IS NULL
       AND token_version = $4
     RETURNING id`,
    [payload.acId, payload.sub, payload.orgId, tokenAcTv],
  )
  if (rows.length > 0) return true
  const { rows: exists } = await pool.query(
    `SELECT token_version FROM agent_connections
     WHERE id = $1 AND user_id = $2 AND organization_id = $3::uuid
       AND active = true AND revoked_at IS NULL`,
    [payload.acId, payload.sub, payload.orgId],
  )
  if (!exists[0]) return false
  if (payload.acTv === undefined || payload.acTv === null) {
    return Number(exists[0].token_version ?? 0) === 0
  }
  return false
}
