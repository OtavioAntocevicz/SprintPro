import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'

const MAX_CONNECTIONS_PER_USER = 20

export function mapAgentConnection(row) {
  return {
    id: row.id,
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
}

export function buildAgentToken(jwtSecret, userRow, connectionId) {
  return jwt.sign(
    {
      sub: userRow.id,
      email: userRow.email,
      orgId: String(userRow.organization_id),
      role: userRow.role,
      tv: Number(userRow.token_version ?? 0),
      typ: 'agent',
      acId: connectionId,
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
    `INSERT INTO agent_connections (id, user_id, organization_id, label, active)
     VALUES ($1, $2, $3, $4, true)
     RETURNING *`,
    [connectionId, userRow.id, userRow.organization_id, cleanLabel],
  )
  const token = buildAgentToken(jwtSecret, userRow, connectionId)
  return { connection: mapAgentConnection(rows[0]), token }
}

export async function validateAgentConnection(pool, payload) {
  if (payload.typ !== 'agent' || !payload.acId) {
    return true
  }
  const { rows } = await pool.query(
    `UPDATE agent_connections
     SET last_used_at = now()
     WHERE id = $1 AND user_id = $2 AND organization_id = $3::uuid
       AND active = true AND revoked_at IS NULL
     RETURNING id`,
    [payload.acId, payload.sub, payload.orgId],
  )
  return rows.length > 0
}
