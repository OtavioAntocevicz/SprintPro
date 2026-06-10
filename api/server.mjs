import bcrypt from 'bcryptjs'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Pool, neonConfig } from '@neondatabase/serverless'
import jwt from 'jsonwebtoken'
import WebSocket from 'ws'

neonConfig.webSocketConstructor = WebSocket

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env') })
dotenv.config({ path: join(__dirname, '..', '.env.local') })
const JWT_SECRET = process.env.JWT_SECRET
const DATABASE_URL = process.env.DATABASE_URL
const PORT = Number(process.env.API_PORT || 8787)
const IS_PROD = process.env.NODE_ENV === 'production'

if (!JWT_SECRET || JWT_SECRET.length < 16) {
  console.error('Defina JWT_SECRET (mín. 16 caracteres) no .env na raiz do projeto.')
  process.exit(1)
}
if (!DATABASE_URL) {
  console.error('Defina DATABASE_URL no .env (connection string do Neon).')
  process.exit(1)
}

/**
 * Ajustes na URL: remove `channel_binding` (incompatível com muitos clientes) e
 * reforça `sslmode` / `uselibpqcompat` (evita avisos e resets com o driver clássico `pg`;
 * o driver usado abaixo é o da Neon, via WebSocket).
 */
function normalizeNeonDatabaseUrl(raw) {
  if (!raw || typeof raw !== 'string') return raw
  try {
    const u = new URL(raw)
    u.searchParams.delete('channel_binding')
    u.searchParams.set('sslmode', 'require')
    u.searchParams.set('uselibpqcompat', 'true')
    return u.toString()
  } catch {
    return raw
      .replace(/[?&]channel_binding=[^&]*/gi, '')
      .replace(/\?&/, '?')
      .replace(/[?&]$/, '')
  }
}

const dbUrl = normalizeNeonDatabaseUrl(DATABASE_URL)
const pool = new Pool({ connectionString: dbUrl, max: 10 })
pool.on('error', (err) => {
  console.error('[DB] Erro inesperado no pool:', err)
})

function mapUser(r) {
  return {
    id: r.id,
    fullName: r.full_name,
    email: r.email,
    organizationId: r.organization_id,
    role: r.role,
    canFavorite: r.role === 'owner' ? true : Boolean(r.can_favorite),
    createdAt: toIso(r.created_at),
    lastSeenAt: r.last_seen_at ? toIso(r.last_seen_at) : undefined,
  }
}

function mapBoard(r) {
  return {
    id: r.id,
    name: r.name,
    organizationId: r.organization_id,
    featured: r.featured,
    createdAt: toIso(r.created_at),
  }
}

function mapTask(r) {
  let dueDate
  if (r.due_date) {
    if (r.due_date instanceof Date) {
      dueDate = r.due_date.toISOString().slice(0, 10)
    } else {
      dueDate = String(r.due_date).slice(0, 10)
    }
  }
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    boardId: r.board_id,
    organizationId: r.organization_id,
    label: r.label ?? undefined,
    priority: r.priority ?? undefined,
    dueDate,
    assigneeName: r.assignee_name ?? undefined,
    favorite: Boolean(r.favorite),
    assignedTo: r.assigned_to,
    createdAt: toIso(r.created_at),
  }
}

function mapInvite(r) {
  return {
    id: r.id,
    email: r.email,
    organizationId: r.organization_id,
    role: r.role,
    status: r.status,
    createdAt: toIso(r.created_at),
  }
}

function toIso(v) {
  if (!v) return new Date().toISOString()
  if (v instanceof Date) return v.toISOString()
  return new Date(v).toISOString()
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

function signPasswordResetToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' })
}

function isStrongPassword(password) {
  if (typeof password !== 'string') return false
  if (password.length < 8) return false
  const hasLetter = /[A-Za-z]/.test(password)
  const hasNumber = /\d/.test(password)
  return hasLetter && hasNumber
}

/** Em produção respostas 500 genéricas; em dev o cliente vê a mensagem (ex. coluna em falta no SQL). */
function publicErrorMessage(_generic, e) {
  if (process.env.NODE_ENV === 'production') {
    return _generic
  }
  return e && typeof e === 'object' && 'message' in e ? String(/** @type {Error} */ (e).message) : _generic
}

function authRequired(req, res, next) {
  const h = req.headers.authorization
  if (!h?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autenticado' })
  }
  try {
    req.user = jwt.verify(h.slice(7), JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Sessão inválida' })
  }
}

function requireOrgMatch(req, res, orgId) {
  if (!orgId || req.user.orgId !== orgId) {
    res.status(403).json({ error: 'Sem permissão para este recurso.' })
    return false
  }
  return true
}

const app = express()
const authRateBuckets = new Map()

function getRequestId() {
  return randomUUID().slice(0, 8)
}

function securityHeaders(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  next()
}

function requestLogger(req, res, next) {
  const requestId = getRequestId()
  req.requestId = requestId
  const start = Date.now()
  res.setHeader('X-Request-Id', requestId)
  res.on('finish', () => {
    const ms = Date.now() - start
    console.log(`[${requestId}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`)
  })
  next()
}

function authRateLimit(req, res, next) {
  const ip =
    req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown'
  const key = `${ip}:${req.path}`
  const now = Date.now()
  const windowMs = 15 * 60 * 1000
  const limit = 15
  const bucket = authRateBuckets.get(key)

  if (!bucket || now >= bucket.resetAt) {
    authRateBuckets.set(key, { count: 1, resetAt: now + windowMs })
    return next()
  }

  if (bucket.count >= limit) {
    const retrySecs = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
    res.setHeader('Retry-After', String(retrySecs))
    return res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' })
  }

  bucket.count += 1
  authRateBuckets.set(key, bucket)
  next()
}

const corsOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL.trim()] : []),
  ...(process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
])

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || corsOrigins.has(origin)) {
        callback(null, true)
        return
      }
      callback(new Error(`Origem não permitida pelo CORS: ${origin}`))
    },
    credentials: true,
  }),
)
app.use(securityHeaders)
app.use(requestLogger)
app.use(express.json({ limit: '1mb' }))

app.post('/api/auth/register', authRateLimit, async (req, res) => {
  const { email, password, fullName, organizationName } = req.body ?? {}
  const em = String(email ?? '')
    .trim()
    .toLowerCase()
  const org = String(organizationName ?? '').trim()
  const name = String(fullName ?? '').trim()
  if (!em || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' })
  }
  if (!isStrongPassword(password)) {
    return res.status(400).json({ error: 'A senha deve ter no mínimo 8 caracteres e incluir letras e números.' })
  }
  if (!name) return res.status(400).json({ error: 'Informe o nome completo.' })
  if (!org) return res.status(400).json({ error: 'Informe o nome da organização.' })
  let client
  try {
    client = await pool.connect()
    const exists = await client.query('SELECT 1 FROM users WHERE LOWER(email) = LOWER($1)', [em])
    if (exists.rowCount) {
      return res.status(409).json({ error: 'Já existe uma conta com este email.' })
    }
    const userId = randomUUID()
    const hash = await bcrypt.hash(password, 10)
    await client.query('BEGIN')
    const orgRow = await client.query(
      'INSERT INTO organizations (name, owner_id) VALUES ($1, $2) RETURNING id, name',
      [org, userId],
    )
    const organizationId = orgRow.rows[0].id
    const orgTitle = orgRow.rows[0].name
    await client.query(
      `INSERT INTO users (id, full_name, email, organization_id, role, password_hash, can_favorite)
       VALUES ($1, $2, $3, $4, 'owner', $5, true)`,
      [userId, name, em, organizationId, hash],
    )
    await client.query('COMMIT')
    const token = signToken({
      sub: userId,
      email: em,
      orgId: String(organizationId),
      role: 'owner',
    })
    const user = {
      id: userId,
      fullName: name,
      email: em,
      organizationId: String(organizationId),
      role: 'owner',
      createdAt: new Date().toISOString(),
      organizationName: orgTitle,
    }
    return res.status(201).json({ token, user, organization: { id: String(organizationId), name: orgTitle } })
  } catch (e) {
    await client?.query('ROLLBACK').catch(() => {})
    console.error(e)
    return res.status(500).json({ error: publicErrorMessage('Erro ao criar conta.', e) })
  } finally {
    if (client) client.release()
  }
})

app.post('/api/auth/login', authRateLimit, async (req, res) => {
  const { email, password } = req.body ?? {}
  const em = String(email ?? '')
    .trim()
    .toLowerCase()
  if (!em || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' })
  }
  try {
    const { rows } = await pool.query(
      `SELECT u.*, o.name AS org_name
       FROM users u
       JOIN organizations o ON o.id = u.organization_id
       WHERE LOWER(u.email) = LOWER($1)`,
      [em],
    )
    const row = rows[0]
    if (!row?.password_hash) {
      return res.status(401).json({ error: 'Credenciais inválidas ou conta sem senha definida.' })
    }
    const ok = await bcrypt.compare(password, row.password_hash)
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas.' })
    const token = signToken({
      sub: row.id,
      email: row.email,
      orgId: String(row.organization_id),
      role: row.role,
    })
    const u = mapUser(row)
    const user = {
      ...u,
      organizationId: String(u.organizationId),
      organizationName: row.org_name,
    }
    return res.json({
      token,
      user,
      organization: { id: String(row.organization_id), name: row.org_name },
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Erro ao entrar.' })
  }
})

app.post('/api/auth/forgot-password', authRateLimit, async (req, res) => {
  const em = String(req.body?.email ?? '')
    .trim()
    .toLowerCase()
  const genericResponse = {
    ok: true,
    message: 'Se existir uma conta para este email, enviamos um link para redefinir a senha.',
  }
  if (!em) {
    return res.json(genericResponse)
  }
  try {
    const { rows } = await pool.query('SELECT id, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [em])
    const user = rows[0]
    if (!user) {
      return res.json(genericResponse)
    }
    const token = signPasswordResetToken({
      sub: user.id,
      email: user.email,
      type: 'password_reset',
    })
    if (IS_PROD) {
      return res.json(genericResponse)
    }
    const appUrl = process.env.APP_URL || 'http://localhost:5173'
    const resetLink = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`
    return res.json({ ...genericResponse, resetLink })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Erro ao solicitar recuperação de senha.' })
  }
})

app.post('/api/auth/reset-password', authRateLimit, async (req, res) => {
  const token = String(req.body?.token ?? '')
  const newPassword = String(req.body?.newPassword ?? '')
  if (!token) {
    return res.status(400).json({ error: 'Token de recuperação é obrigatório.' })
  }
  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({ error: 'A senha deve ter no mínimo 8 caracteres e incluir letras e números.' })
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    if (!payload || typeof payload !== 'object' || payload.type !== 'password_reset') {
      return res.status(400).json({ error: 'Token inválido.' })
    }
    const userId = String(payload.sub ?? '')
    const email = String(payload.email ?? '')
    if (!userId || !email) {
      return res.status(400).json({ error: 'Token inválido.' })
    }
    const hash = await bcrypt.hash(newPassword, 10)
    const { rowCount } = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 AND LOWER(email) = LOWER($3)',
      [hash, userId, email],
    )
    if (!rowCount) {
      return res.status(404).json({ error: 'Conta não encontrada para este token.' })
    }
    return res.json({ ok: true })
  } catch (e) {
    if (e?.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Token expirado. Solicite um novo link.' })
    }
    return res.status(400).json({ error: 'Token inválido ou expirado.' })
  }
})

app.post('/api/auth/register-invite', authRateLimit, async (req, res) => {
  const { inviteId, email, password, fullName } = req.body ?? {}
  const em = String(email ?? '')
    .trim()
    .toLowerCase()
  const inv = String(inviteId ?? '').trim()
  const name = String(fullName ?? '').trim()
  if (!inv || !em || !password) {
    return res.status(400).json({ error: 'Dados do convite incompletos.' })
  }
  if (!isStrongPassword(password)) {
    return res.status(400).json({ error: 'A senha deve ter no mínimo 8 caracteres e incluir letras e números.' })
  }
  if (!name) return res.status(400).json({ error: 'Informe o nome completo.' })
  let client
  try {
    client = await pool.connect()
    const inviteRes = await client.query(
      `SELECT * FROM invites
       WHERE id = $1 AND status = 'pending' AND LOWER(email) = LOWER($2)`,
      [inv, em],
    )
    const invRow = inviteRes.rows[0]
    if (!invRow) {
      return res.status(404).json({ error: 'Convite não encontrado ou já utilizado.' })
    }
    const taken = await client.query('SELECT 1 FROM users WHERE LOWER(email) = LOWER($1)', [em])
    if (taken.rowCount) {
      return res.status(409).json({ error: 'Já existe uma conta com este email.' })
    }
    const userId = randomUUID()
    const hash = await bcrypt.hash(password, 10)
    const org = await client.query('SELECT name FROM organizations WHERE id = $1', [invRow.organization_id])
    const orgName = org.rows[0]?.name ?? ''
    await client.query('BEGIN')
    await client.query(
      `INSERT INTO users (id, full_name, email, organization_id, role, password_hash, can_favorite)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, name, em, invRow.organization_id, invRow.role, hash, invRow.role === 'owner'],
    )
    await client.query(`UPDATE invites SET status = 'accepted' WHERE id = $1`, [invRow.id])
    await client.query('COMMIT')
    const token = signToken({
      sub: userId,
      email: em,
      orgId: String(invRow.organization_id),
      role: invRow.role,
    })
    const user = {
      id: userId,
      fullName: name,
      email: em,
      organizationId: String(invRow.organization_id),
      role: invRow.role,
      createdAt: new Date().toISOString(),
      organizationName: orgName,
    }
    return res.status(201).json({
      token,
      user,
      organization: { id: String(invRow.organization_id), name: orgName },
    })
  } catch (e) {
    await client?.query('ROLLBACK').catch(() => {})
    console.error(e)
    return res.status(500).json({ error: publicErrorMessage('Erro ao aceitar convite.', e) })
  } finally {
    if (client) client.release()
  }
})

app.get('/api/me', authRequired, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.*, o.name AS org_name
       FROM users u
       JOIN organizations o ON o.id = u.organization_id
       WHERE u.id = $1`,
      [req.user.sub],
    )
    const row = rows[0]
    if (!row) return res.status(404).json({ error: 'Utilizador não encontrado.' })
    if (row.organization_id !== req.user.orgId) {
      return res.status(401).json({ error: 'Sessão inconsistente. Entre novamente.' })
    }
    const user = { ...mapUser(row), organizationName: row.org_name }
    return res.json({
      user,
      organization: { id: row.organization_id, name: row.org_name },
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Erro ao carregar perfil.' })
  }
})

app.patch('/api/settings/profile', authRequired, async (req, res) => {
  if (!requireOrgMatch(req, res, req.user.orgId)) return
  const fullName = String(req.body?.fullName ?? '').trim()
  if (!fullName) {
    return res.status(400).json({ error: 'Nome completo é obrigatório.' })
  }
  try {
    const { rows } = await pool.query(
      `UPDATE users
       SET full_name = $1
       WHERE id = $2 AND organization_id = $3
       RETURNING *`,
      [fullName, req.user.sub, req.user.orgId],
    )
    if (!rows[0]) return res.status(404).json({ error: 'Utilizador não encontrado.' })
    return res.json(mapUser(rows[0]))
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Erro ao atualizar perfil.' })
  }
})

app.patch('/api/settings/organization', authRequired, async (req, res) => {
  if (!requireOrgMatch(req, res, req.user.orgId)) return
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Apenas o gestor pode alterar a organização.' })
  }
  const name = String(req.body?.name ?? '').trim()
  if (!name) {
    return res.status(400).json({ error: 'Nome da organização é obrigatório.' })
  }
  try {
    const { rows } = await pool.query(
      `UPDATE organizations
       SET name = $1
       WHERE id = $2 AND owner_id = $3
       RETURNING id, name`,
      [name, req.user.orgId, req.user.sub],
    )
    if (!rows[0]) return res.status(404).json({ error: 'Organização não encontrada.' })
    return res.json({ id: rows[0].id, name: rows[0].name })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Erro ao atualizar organização.' })
  }
})

app.post('/api/settings/change-password', authRequired, async (req, res) => {
  if (!requireOrgMatch(req, res, req.user.orgId)) return
  const currentPassword = String(req.body?.currentPassword ?? '')
  const newPassword = String(req.body?.newPassword ?? '')
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias.' })
  }
  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({ error: 'A nova senha deve ter no mínimo 8 caracteres e incluir letras e números.' })
  }
  try {
    const { rows } = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1 AND organization_id = $2',
      [req.user.sub, req.user.orgId],
    )
    const user = rows[0]
    if (!user?.password_hash) {
      return res.status(400).json({ error: 'Conta sem senha definida.' })
    }
    const ok = await bcrypt.compare(currentPassword, user.password_hash)
    if (!ok) {
      return res.status(401).json({ error: 'Senha atual inválida.' })
    }
    const hash = await bcrypt.hash(newPassword, 10)
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 AND organization_id = $3',
      [hash, req.user.sub, req.user.orgId],
    )
    return res.json({ ok: true })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Erro ao alterar senha.' })
  }
})

app.delete('/api/settings/account', authRequired, async (req, res) => {
  if (!requireOrgMatch(req, res, req.user.orgId)) return
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Apenas o gestor pode excluir a conta principal.' })
  }
  const confirm = String(req.body?.confirm ?? '')
  if (confirm !== 'EXCLUIR') {
    return res.status(400).json({ error: 'Confirmação inválida. Digite EXCLUIR.' })
  }
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const orgCheck = await client.query(
      'SELECT id FROM organizations WHERE id = $1 AND owner_id = $2',
      [req.user.orgId, req.user.sub],
    )
    if (!orgCheck.rowCount) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Organização principal não encontrada.' })
    }
    await client.query('DELETE FROM organizations WHERE id = $1', [req.user.orgId])
    await client.query('COMMIT')
    return res.status(204).send()
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    console.error(e)
    return res.status(500).json({ error: 'Erro ao excluir conta principal.' })
  } finally {
    client.release()
  }
})

app.get('/api/boards', authRequired, async (req, res) => {
  if (!requireOrgMatch(req, res, req.user.orgId)) return
  try {
    const { rows } = await pool.query(
      'SELECT * FROM boards WHERE organization_id = $1 ORDER BY created_at ASC',
      [req.user.orgId],
    )
    return res.json(rows.map(mapBoard))
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Erro ao listar quadros.' })
  }
})

app.post('/api/boards', authRequired, async (req, res) => {
  if (!requireOrgMatch(req, res, req.user.orgId)) return
  const name = String(req.body?.name ?? '').trim() || 'Novo quadro'
  try {
    const { rows } = await pool.query(
      `INSERT INTO boards (organization_id, name) VALUES ($1, $2) RETURNING *`,
      [req.user.orgId, name],
    )
    return res.status(201).json(mapBoard(rows[0]))
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Erro ao criar quadro.' })
  }
})

app.patch('/api/boards/:id/featured', authRequired, async (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Apenas o gestor pode alterar o destaque.' })
  }
  if (!requireOrgMatch(req, res, req.user.orgId)) return
  const boardId = req.params.id
  const featured = Boolean(req.body?.featured)
  try {
    const check = await pool.query(
      'SELECT id FROM boards WHERE id = $1 AND organization_id = $2',
      [boardId, req.user.orgId],
    )
    if (!check.rowCount) return res.status(404).json({ error: 'Quadro não encontrado.' })
    const { rows } = await pool.query(
      'UPDATE boards SET featured = $1 WHERE id = $2 RETURNING *',
      [featured, boardId],
    )
    return res.json(mapBoard(rows[0]))
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Erro ao atualizar quadro.' })
  }
})

app.get('/api/boards/:boardId/tasks', authRequired, async (req, res) => {
  if (!requireOrgMatch(req, res, req.user.orgId)) return
  const { boardId } = req.params
  try {
    const b = await pool.query('SELECT id FROM boards WHERE id = $1 AND organization_id = $2', [
      boardId,
      req.user.orgId,
    ])
    if (!b.rowCount) return res.status(404).json({ error: 'Quadro não encontrado.' })
    const { rows } = await pool.query(
      'SELECT * FROM tasks WHERE board_id = $1 AND organization_id = $2 ORDER BY created_at ASC',
      [boardId, req.user.orgId],
    )
    return res.json(rows.map(mapTask))
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Erro ao listar tarefas.' })
  }
})

app.get('/api/organization/tasks', authRequired, async (req, res) => {
  if (!requireOrgMatch(req, res, req.user.orgId)) return
  try {
    const { rows } = await pool.query('SELECT * FROM tasks WHERE organization_id = $1', [req.user.orgId])
    return res.json(rows.map(mapTask))
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Erro ao listar tarefas da organização.' })
  }
})

app.post('/api/tasks', authRequired, async (req, res) => {
  if (!requireOrgMatch(req, res, req.user.orgId)) return
  const b = String(req.body?.boardId ?? '')
  if (!b) return res.status(400).json({ error: 'boardId é obrigatório.' })
  try {
    const boardOk = await pool.query(
      'SELECT id FROM boards WHERE id = $1 AND organization_id = $2',
      [b, req.user.orgId],
    )
    if (!boardOk.rowCount) return res.status(404).json({ error: 'Quadro não encontrado.' })
    const title = String(req.body?.title ?? '').trim()
    if (!title) return res.status(400).json({ error: 'Título da tarefa é obrigatório.' })
    const description = String(req.body?.description ?? '')
    const label = req.body?.label ? String(req.body.label) : null
    const priority = req.body?.priority || null
    const dueDate = req.body?.dueDate ? String(req.body.dueDate) : null
    const assigneeName = req.body?.assigneeName ? String(req.body.assigneeName) : null
    const assignedTo = req.body?.assignedTo ? String(req.body.assignedTo) : null

    if (assignedTo) {
      const memberCheck = await pool.query(
        'SELECT id FROM users WHERE id = $1 AND organization_id = $2',
        [assignedTo, req.user.orgId],
      )
      if (!memberCheck.rowCount) {
        return res.status(400).json({ error: 'Responsável inválido para esta organização.' })
      }
    }
    const { rows } = await pool.query(
      `INSERT INTO tasks (
         organization_id, board_id, title, description, status,
         label, priority, due_date, assignee_name, assigned_to, favorite
       ) VALUES ($1, $2, $3, $4, 'todo', $5, $6, $7, $8, $9, false)
       RETURNING *`,
      [req.user.orgId, b, title, description, label, priority, dueDate, assigneeName, assignedTo],
    )
    return res.status(201).json(mapTask(rows[0]))
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Erro ao criar tarefa.' })
  }
})

app.patch('/api/tasks/:id', authRequired, async (req, res) => {
  if (!requireOrgMatch(req, res, req.user.orgId)) return
  const taskId = req.params.id
  const rawStatus = req.body?.status
  const normalizedStatus =
    typeof rawStatus === 'string' ? rawStatus.trim().toLowerCase() : undefined
  const hasStatus = typeof normalizedStatus === 'string' && normalizedStatus.length > 0
  const hasFavorite = typeof req.body?.favorite === 'boolean'
  const statusIsValid = hasStatus && ['todo', 'doing', 'done'].includes(normalizedStatus)
  if (!hasStatus && !hasFavorite) {
    return res.status(400).json({ error: 'Nada para atualizar.' })
  }
  if (hasFavorite) {
    try {
      const { rows } = await pool.query(
        'SELECT role, can_favorite FROM users WHERE id = $1 AND organization_id = $2',
        [req.user.sub, req.user.orgId],
      )
      const actor = rows[0]
      const actorCanFavorite = actor?.role === 'owner' || Boolean(actor?.can_favorite)
      if (!actorCanFavorite) {
        return res.status(403).json({ error: 'Sem permissão para favoritar tarefas.' })
      }
    } catch (e) {
      console.error(e)
      return res.status(500).json({ error: 'Erro ao validar permissão de favorito.' })
    }
  }
  if (hasStatus && !statusIsValid && !hasFavorite) {
    return res.status(400).json({ error: 'Status inválido.' })
  }
  try {
    const updates = []
    const values = []
    let idx = 1
    if (statusIsValid) {
      updates.push(`status = $${idx++}`)
      values.push(normalizedStatus)
    }
    if (hasFavorite) {
      updates.push(`favorite = $${idx++}`)
      values.push(Boolean(req.body.favorite))
    }
    values.push(taskId)
    values.push(req.user.orgId)
    const { rows } = await pool.query(
      `UPDATE tasks
       SET ${updates.join(', ')}
       WHERE id = $${idx++} AND organization_id = $${idx}
       RETURNING *`,
      values,
    )
    if (!rows[0]) return res.status(404).json({ error: 'Tarefa não encontrada.' })
    return res.json(mapTask(rows[0]))
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Erro ao atualizar tarefa.' })
  }
})

app.delete('/api/tasks/:id', authRequired, async (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Apenas o gestor pode excluir tarefas.' })
  }
  if (!requireOrgMatch(req, res, req.user.orgId)) return
  const taskId = req.params.id
  try {
    const check = await pool.query(
      'SELECT id, status FROM tasks WHERE id = $1 AND organization_id = $2',
      [taskId, req.user.orgId],
    )
    if (!check.rowCount) {
      return res.status(404).json({ error: 'Tarefa não encontrada.' })
    }
    const status = check.rows[0].status
    if (status !== 'done') {
      return res.status(400).json({ error: 'Só é possível excluir tarefa concluída.' })
    }
    await pool.query('DELETE FROM tasks WHERE id = $1 AND organization_id = $2', [taskId, req.user.orgId])
    return res.status(204).send()
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Erro ao excluir tarefa.' })
  }
})

app.get('/api/organization/members', authRequired, async (req, res) => {
  if (!requireOrgMatch(req, res, req.user.orgId)) return
  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE organization_id = $1 ORDER BY created_at ASC',
      [req.user.orgId],
    )
    return res.json(rows.map(mapUser))
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Erro ao listar membros.' })
  }
})

app.patch('/api/organization/members/:memberId/favorite-permission', authRequired, async (req, res) => {
  if (!requireOrgMatch(req, res, req.user.orgId)) return
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Apenas o gestor pode gerir permissões.' })
  }
  const memberId = req.params.memberId
  const canFavorite = typeof req.body?.canFavorite === 'boolean' ? req.body.canFavorite : null
  if (canFavorite === null) {
    return res.status(400).json({ error: 'canFavorite deve ser boolean.' })
  }
  try {
    const { rows: checkRows } = await pool.query(
      'SELECT id, role FROM users WHERE id = $1 AND organization_id = $2',
      [memberId, req.user.orgId],
    )
    const member = checkRows[0]
    if (!member) return res.status(404).json({ error: 'Membro não encontrado.' })
    if (member.role === 'owner') {
      return res.status(400).json({ error: 'Permissão de gestor não pode ser alterada aqui.' })
    }

    const { rows } = await pool.query(
      'UPDATE users SET can_favorite = $1 WHERE id = $2 AND organization_id = $3 RETURNING *',
      [canFavorite, memberId, req.user.orgId],
    )
    return res.json(mapUser(rows[0]))
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Erro ao atualizar permissão.' })
  }
})

app.delete('/api/organization/members/:memberId', authRequired, async (req, res) => {
  if (!requireOrgMatch(req, res, req.user.orgId)) return
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Apenas o gestor pode excluir membros.' })
  }
  const memberId = req.params.memberId
  if (memberId === req.user.sub) {
    return res.status(400).json({ error: 'Não é permitido remover a própria conta.' })
  }
  try {
    const { rows: checkRows } = await pool.query(
      'SELECT id, role FROM users WHERE id = $1 AND organization_id = $2',
      [memberId, req.user.orgId],
    )
    const member = checkRows[0]
    if (!member) return res.status(404).json({ error: 'Membro não encontrado.' })
    if (member.role === 'owner') {
      return res.status(400).json({ error: 'Não é permitido excluir outro gestor.' })
    }

    await pool.query('DELETE FROM users WHERE id = $1 AND organization_id = $2', [memberId, req.user.orgId])
    return res.status(204).send()
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Erro ao excluir membro.' })
  }
})

app.get('/api/organization/invites', authRequired, async (req, res) => {
  if (!requireOrgMatch(req, res, req.user.orgId)) return
  try {
    const { rows } = await pool.query(
      'SELECT * FROM invites WHERE organization_id = $1 ORDER BY created_at DESC',
      [req.user.orgId],
    )
    return res.json(rows.map(mapInvite))
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Erro ao listar convites.' })
  }
})

app.post('/api/presence/heartbeat', authRequired, async (req, res) => {
  if (!requireOrgMatch(req, res, req.user.orgId)) return
  try {
    await pool.query(
      `UPDATE users
       SET last_seen_at = now()
       WHERE id = $1 AND organization_id = $2`,
      [req.user.sub, req.user.orgId],
    )
    return res.json({ ok: true })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Erro ao atualizar presença.' })
  }
})

app.get('/api/presence/online', authRequired, async (req, res) => {
  if (!requireOrgMatch(req, res, req.user.orgId)) return
  try {
    const { rows } = await pool.query(
      `SELECT *
       FROM users
       WHERE organization_id = $1
         AND COALESCE(last_seen_at, created_at) >= now() - interval '70 seconds'
       ORDER BY COALESCE(last_seen_at, created_at) DESC`,
      [req.user.orgId],
    )
    return res.json(rows.map(mapUser))
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Erro ao listar utilizadores online.' })
  }
})

app.post('/api/invites', authRequired, async (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Apenas o gestor pode enviar convites.' })
  }
  if (!requireOrgMatch(req, res, req.user.orgId)) return
  const em = String(req.body?.email ?? '')
    .trim()
    .toLowerCase()
  const role = req.body?.role === 'owner' ? 'owner' : 'member'
  if (!em) return res.status(400).json({ error: 'Email do convidado é obrigatório.' })
  try {
    const { rows } = await pool.query(
      `INSERT INTO invites (email, organization_id, role, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [em, req.user.orgId, role],
    )
    return res.status(201).json(mapInvite(rows[0]))
  } catch (e) {
    if (e?.code === '23505') {
      return res.status(409).json({ error: 'Já existe convite ou utilizador com este email.' })
    }
    console.error(e)
    return res.status(500).json({ error: 'Erro ao criar convite.' })
  }
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use((_req, res) => {
  res.status(404).json({ error: 'Não encontrado' })
})

app.use((err, _req, res, _next) => {
  console.error(err)
  if (!IS_PROD && err?.stack) {
    console.error(err.stack)
  }
  res.status(500).json({ error: 'Erro interno' })
})

app.listen(PORT, async () => {
  console.log(`SprintPro API a escutar em http://127.0.0.1:${PORT}`)
  console.log('[DB] Driver @neondatabase/serverless (WebSocket) — evita ECONNRESET comuns do `pg` + TLS no Windows.')
  try {
    await pool.query('SELECT 1')
    console.log('[DB] Teste `SELECT 1` ao Neon: OK')
  } catch (e) {
    console.error('[DB] Não foi possível ligar ao Neon:', e?.message || e)
  }
})
