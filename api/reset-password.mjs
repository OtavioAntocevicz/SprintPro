/**
 * Troca senha direto no Neon (sem e-mail / Resend).
 *
 * Uso (na pasta api ou pela raiz):
 *   npm run reset-password -- voce@empresa.com NovaSenha1
 *
 * Requer DATABASE_URL no .env da raiz do projeto.
 */
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { neonConfig, Pool } from '@neondatabase/serverless'
import WebSocket from 'ws'

neonConfig.webSocketConstructor = WebSocket

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env') })
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const email = String(process.argv[2] ?? '')
  .trim()
  .toLowerCase()
const newPassword = String(process.argv[3] ?? '')

function isStrongPassword(password) {
  if (typeof password !== 'string') return false
  if (password.length < 8) return false
  return /[A-Za-z]/.test(password) && /\d/.test(password)
}

if (!email || !newPassword) {
  console.error('Uso: npm run reset-password -- email@dominio.com NovaSenha1')
  process.exit(1)
}
if (!isStrongPassword(newPassword)) {
  console.error('A senha deve ter no mínimo 8 caracteres e incluir letras e números.')
  process.exit(1)
}
if (!process.env.DATABASE_URL) {
  console.error('Defina DATABASE_URL no .env da raiz do projeto.')
  process.exit(1)
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

try {
  const hash = await bcrypt.hash(newPassword, 10)
  const { rowCount } = await pool.query(
    'UPDATE users SET password_hash = $1 WHERE LOWER(email) = LOWER($2)',
    [hash, email],
  )
  if (!rowCount) {
    console.error(`Nenhuma conta encontrada para: ${email}`)
    process.exit(1)
  }
  console.log(`Senha atualizada com sucesso para ${email}.`)
} catch (e) {
  console.error(e)
  process.exit(1)
} finally {
  await pool.end()
}
