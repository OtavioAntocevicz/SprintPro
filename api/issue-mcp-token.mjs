/**
 * Gera JWT de longa duração para o servidor MCP (agente / GrokBot / Cursor).
 *
 * Uso na raiz: npm run mcp:token -- voce@empresa.com [nome-da-conexão]
 */
import dotenv from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { neonConfig, Pool } from '@neondatabase/serverless'
import WebSocket from 'ws'
import {
  createAgentConnection,
  ensureAgentConnectionsSchema,
} from './lib/agent-connections.mjs'

neonConfig.webSocketConstructor = WebSocket

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env') })
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const email = String(process.argv[2] ?? '')
  .trim()
  .toLowerCase()
const label = String(process.argv[3] ?? 'CLI MCP').trim() || 'CLI MCP'

if (!email) {
  console.error('Uso: npm run mcp:token -- email@dominio.com [nome-da-conexão]')
  process.exit(1)
}

const JWT_SECRET = process.env.JWT_SECRET
const DATABASE_URL = process.env.DATABASE_URL

if (!JWT_SECRET || JWT_SECRET.length < 16) {
  console.error('Defina JWT_SECRET (mín. 16 caracteres) no .env.')
  process.exit(1)
}
if (!DATABASE_URL) {
  console.error('Defina DATABASE_URL no .env.')
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })

try {
  await ensureAgentConnectionsSchema(pool)
  const { rows } = await pool.query(
    `SELECT id, email, organization_id, role, token_version
     FROM users WHERE LOWER(email) = LOWER($1)`,
    [email],
  )
  const row = rows[0]
  if (!row) {
    console.error(`Nenhuma conta encontrada para: ${email}`)
    process.exit(1)
  }

  const created = await createAgentConnection(pool, JWT_SECRET, row, label)
  if (created.error) {
    console.error(created.error)
    process.exit(1)
  }

  console.log('')
  console.log(`# Conexão MCP: ${created.connection.label} (${created.connection.id})`)
  console.log('# Token válido 365 dias; desative em Configurações → Conexões MCP.')
  console.log('')
  console.log(`SPRINTPRO_TOKEN=${created.token}`)
  console.log('')
  console.log('SPRINTPRO_API_URL=http://127.0.0.1:8787')
  console.log('SPRINTPRO_DEFAULT_BOARD_NAME=Geral')
  console.log('')
} catch (e) {
  console.error(e)
  process.exit(1)
} finally {
  await pool.end()
}
