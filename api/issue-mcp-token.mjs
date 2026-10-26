/**
 * Gera JWT de longa duração para o servidor MCP (agente / GrokBot / Cursor).
 *
 * Uso na raiz: npm run mcp:token -- voce@empresa.com
 */
import dotenv from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { neonConfig, Pool } from '@neondatabase/serverless'
import jwt from 'jsonwebtoken'
import WebSocket from 'ws'

neonConfig.webSocketConstructor = WebSocket

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env') })
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const email = String(process.argv[2] ?? '')
  .trim()
  .toLowerCase()

if (!email) {
  console.error('Uso: npm run mcp:token -- email@dominio.com')
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

  const token = jwt.sign(
    {
      sub: row.id,
      email: row.email,
      orgId: String(row.organization_id),
      role: row.role,
      tv: Number(row.token_version ?? 0),
      typ: 'agent',
    },
    JWT_SECRET,
    { expiresIn: '365d' },
  )

  console.log('')
  console.log('# Token MCP SprintPro (válido 365 dias; invalida se token_version do usuário mudar)')
  console.log('')
  console.log(`SPRINTPRO_TOKEN=${token}`)
  console.log('')
  console.log('# Opcional: URL da API (produção ou local)')
  console.log('SPRINTPRO_API_URL=http://127.0.0.1:8787')
  console.log('SPRINTPRO_DEFAULT_BOARD_NAME=Geral')
  console.log('')
} catch (e) {
  console.error(e)
  process.exit(1)
} finally {
  await pool.end()
}
