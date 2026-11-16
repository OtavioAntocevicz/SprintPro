import express from 'express'
import {
  ensureAgentConnectionsSchema,
  findOrCreateOAuthConnection,
  rotateActiveConnectionToken,
} from './agent-connections.mjs'
import {
  ACCESS_TOKEN_TTL_SECONDS,
  CODE_TTL_MS,
  OAUTH_SCOPE,
  authorizationServerMetadata,
  buildRedirect,
  protectedResourceMetadata,
  randomToken,
  readClientCredentials,
  safeEqual,
  sha256,
  validateAuthorizeParams,
  validateClientRegistration,
  verifyPkce,
} from './oauth.mjs'

let schemaReady = false

export async function ensureOAuthSchema(pool) {
  if (schemaReady) return
  await ensureAgentConnectionsSchema(pool)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS oauth_clients (
      client_id           text PRIMARY KEY,
      client_secret_hash  text,
      client_name         text NOT NULL,
      redirect_uris       jsonb NOT NULL,
      auth_method         text NOT NULL DEFAULT 'none',
      created_at          timestamptz NOT NULL DEFAULT now()
    );
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS oauth_codes (
      code_hash        text PRIMARY KEY,
      client_id        text NOT NULL REFERENCES oauth_clients (client_id) ON DELETE CASCADE,
      user_id          text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      redirect_uri     text NOT NULL,
      code_challenge   text NOT NULL,
      expires_at       timestamptz NOT NULL,
      used_at          timestamptz
    );
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
      token_hash     text PRIMARY KEY,
      client_id      text NOT NULL REFERENCES oauth_clients (client_id) ON DELETE CASCADE,
      user_id        text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      connection_id  uuid NOT NULL REFERENCES agent_connections (id) ON DELETE CASCADE,
      created_at     timestamptz NOT NULL DEFAULT now(),
      revoked_at     timestamptz
    );
  `)
  schemaReady = true
}

function oauthError(res, status, error, description) {
  res.setHeader('Cache-Control', 'no-store')
  return res.status(status).json({ error, error_description: description })
}

/**
 * Servidor de autorização OAuth 2.1 (com PKCE e registro dinâmico) para o MCP remoto.
 * O consentimento acontece no frontend (/oauth/authorize), com a sessão normal do SprintPro.
 */
export function registerOAuthRoutes(app, { pool, jwtSecret, authRequired, baseUrlFor, appUrlFor }) {
  async function getClient(clientId) {
    if (!clientId) return null
    const { rows } = await pool.query('SELECT * FROM oauth_clients WHERE client_id = $1', [String(clientId)])
    return rows[0] ?? null
  }

  async function getUserRow(userId) {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.organization_id, u.role, u.token_version, o.name AS org_name
       FROM users u JOIN organizations o ON o.id = u.organization_id
       WHERE u.id = $1`,
      [userId],
    )
    return rows[0] ?? null
  }

  /** Só sessões normais (login no app) podem autorizar; tokens de agente não. */
  function requireBrowserSession(req, res, next) {
    if (req.user?.typ === 'agent') {
      return res.status(403).json({ error: 'Use sua sessão do SprintPro para autorizar.' })
    }
    next()
  }

  // ---- Descoberta ----
  const sendResourceMetadata = (req, res) => res.json(protectedResourceMetadata(baseUrlFor(req)))
  app.get('/.well-known/oauth-protected-resource', sendResourceMetadata)
  app.get('/.well-known/oauth-protected-resource/api/mcp', sendResourceMetadata)
  app.get('/.well-known/oauth-authorization-server', (req, res) =>
    res.json(authorizationServerMetadata(baseUrlFor(req))),
  )

  // ---- Registro dinâmico de cliente (RFC 7591) ----
  app.post('/api/oauth/register', async (req, res) => {
    const v = validateClientRegistration(req.body)
    if (v.error) return oauthError(res, 400, v.error, v.description)
    try {
      await ensureOAuthSchema(pool)
      const clientId = `spc_${randomToken(18)}`
      const clientSecret = v.authMethod === 'none' ? null : randomToken(32)
      await pool.query(
        `INSERT INTO oauth_clients (client_id, client_secret_hash, client_name, redirect_uris, auth_method)
         VALUES ($1, $2, $3, $4::jsonb, $5)`,
        [clientId, clientSecret ? sha256(clientSecret) : null, v.clientName, JSON.stringify(v.redirectUris), v.authMethod],
      )
      res.setHeader('Cache-Control', 'no-store')
      return res.status(201).json({
        client_id: clientId,
        ...(clientSecret ? { client_secret: clientSecret, client_secret_expires_at: 0 } : {}),
        client_id_issued_at: Math.floor(Date.now() / 1000),
        client_name: v.clientName,
        redirect_uris: v.redirectUris,
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: v.authMethod,
        scope: OAUTH_SCOPE,
      })
    } catch (e) {
      console.error('[oauth/register]', e)
      return oauthError(res, 500, 'server_error', 'Erro ao registrar cliente.')
    }
  })

  // ---- Autorização: valida e manda para a tela de consentimento do app ----
  app.get('/api/oauth/authorize', async (req, res) => {
    try {
      await ensureOAuthSchema(pool)
      const client = await getClient(req.query.client_id)
      const v = validateAuthorizeParams(req.query, client)
      if (v.error && !v.redirect) {
        return res.status(400).type('text/plain; charset=utf-8').send(`Erro de autorização: ${v.description}`)
      }
      if (v.error) {
        return res.redirect(
          302,
          buildRedirect(String(req.query.redirect_uri), {
            error: v.error,
            error_description: v.description,
            state: req.query.state,
          }),
        )
      }
      const qs = new URLSearchParams()
      for (const k of ['client_id', 'redirect_uri', 'response_type', 'code_challenge', 'code_challenge_method', 'state', 'scope', 'resource']) {
        if (req.query[k] !== undefined) qs.set(k, String(req.query[k]))
      }
      return res.redirect(302, `${appUrlFor(req)}/oauth/authorize?${qs.toString()}`)
    } catch (e) {
      console.error('[oauth/authorize]', e)
      return res.status(500).type('text/plain; charset=utf-8').send('Erro interno na autorização.')
    }
  })

  /** Dados para a tela de consentimento. */
  app.get('/api/oauth/authorize/info', authRequired, requireBrowserSession, async (req, res) => {
    try {
      await ensureOAuthSchema(pool)
      const client = await getClient(req.query.client_id)
      const v = validateAuthorizeParams(req.query, client)
      if (v.error) return res.status(400).json({ error: v.description })
      const user = await getUserRow(req.user.sub)
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' })
      return res.json({
        clientName: client.client_name,
        redirectHost: new URL(v.redirectUri).host,
        user: { fullName: user.full_name, email: user.email },
        organization: { name: user.org_name },
      })
    } catch (e) {
      console.error('[oauth/info]', e)
      return res.status(500).json({ error: 'Erro ao carregar a autorização.' })
    }
  })

  /** Permitir / negar: devolve a URL para onde o navegador deve voltar. */
  app.post('/api/oauth/authorize/decision', authRequired, requireBrowserSession, async (req, res) => {
    const params = req.body?.params ?? {}
    try {
      await ensureOAuthSchema(pool)
      const client = await getClient(params.client_id)
      const v = validateAuthorizeParams(params, client)
      if (v.error) return res.status(400).json({ error: v.description })

      if (req.body?.approve !== true) {
        return res.json({
          redirectUrl: buildRedirect(v.redirectUri, { error: 'access_denied', state: params.state }),
        })
      }
      const code = randomToken(32)
      await pool.query(
        `INSERT INTO oauth_codes (code_hash, client_id, user_id, redirect_uri, code_challenge, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [sha256(code), client.client_id, req.user.sub, v.redirectUri, String(params.code_challenge), new Date(Date.now() + CODE_TTL_MS)],
      )
      return res.json({
        redirectUrl: buildRedirect(v.redirectUri, { code, state: params.state, iss: baseUrlFor(req) }),
      })
    } catch (e) {
      console.error('[oauth/decision]', e)
      return res.status(500).json({ error: 'Erro ao concluir a autorização.' })
    }
  })

  // ---- Token ----
  app.post('/api/oauth/token', express.urlencoded({ extended: false }), async (req, res) => {
    const grantType = String(req.body?.grant_type ?? '')
    try {
      await ensureOAuthSchema(pool)
      const { clientId, clientSecret } = readClientCredentials(req)
      const client = await getClient(clientId)
      if (!client) return oauthError(res, 401, 'invalid_client', 'Cliente desconhecido.')
      if (client.client_secret_hash && !safeEqual(sha256(clientSecret), client.client_secret_hash)) {
        return oauthError(res, 401, 'invalid_client', 'Credenciais do cliente inválidas.')
      }

      if (grantType === 'authorization_code') {
        const code = String(req.body?.code ?? '')
        // Uso único e atômico: só a primeira troca marca used_at.
        const { rows } = await pool.query(
          `UPDATE oauth_codes SET used_at = now()
           WHERE code_hash = $1 AND used_at IS NULL AND expires_at > now()
           RETURNING *`,
          [sha256(code)],
        )
        const row = rows[0]
        if (!row || row.client_id !== client.client_id) {
          return oauthError(res, 400, 'invalid_grant', 'Código inválido, expirado ou já usado.')
        }
        if (String(req.body?.redirect_uri ?? '') !== row.redirect_uri) {
          return oauthError(res, 400, 'invalid_grant', 'redirect_uri não confere.')
        }
        if (!verifyPkce(req.body?.code_verifier, row.code_challenge)) {
          return oauthError(res, 400, 'invalid_grant', 'code_verifier inválido.')
        }
        const user = await getUserRow(row.user_id)
        if (!user) return oauthError(res, 400, 'invalid_grant', 'Usuário não encontrado.')
        const issued = await findOrCreateOAuthConnection(pool, jwtSecret, user, client.client_name)
        if (issued.error) return oauthError(res, 400, 'invalid_grant', issued.error)
        const refreshToken = randomToken(32)
        await pool.query(
          `INSERT INTO oauth_refresh_tokens (token_hash, client_id, user_id, connection_id) VALUES ($1, $2, $3, $4)`,
          [sha256(refreshToken), client.client_id, user.id, issued.connection.id],
        )
        pool.query(`DELETE FROM oauth_codes WHERE expires_at < now() - interval '1 day'`).catch(() => {})
        res.setHeader('Cache-Control', 'no-store')
        return res.json({
          access_token: issued.token,
          token_type: 'Bearer',
          expires_in: ACCESS_TOKEN_TTL_SECONDS,
          refresh_token: refreshToken,
          scope: OAUTH_SCOPE,
        })
      }

      if (grantType === 'refresh_token') {
        const { rows } = await pool.query(
          `UPDATE oauth_refresh_tokens SET revoked_at = now()
           WHERE token_hash = $1 AND revoked_at IS NULL
           RETURNING *`,
          [sha256(String(req.body?.refresh_token ?? ''))],
        )
        const row = rows[0]
        if (!row || row.client_id !== client.client_id) {
          return oauthError(res, 400, 'invalid_grant', 'refresh_token inválido.')
        }
        const user = await getUserRow(row.user_id)
        if (!user) return oauthError(res, 400, 'invalid_grant', 'Usuário não encontrado.')
        const rotated = await rotateActiveConnectionToken(pool, jwtSecret, user, row.connection_id)
        if (rotated.error) return oauthError(res, 400, 'invalid_grant', rotated.error)
        const refreshToken = randomToken(32)
        await pool.query(
          `INSERT INTO oauth_refresh_tokens (token_hash, client_id, user_id, connection_id) VALUES ($1, $2, $3, $4)`,
          [sha256(refreshToken), client.client_id, user.id, row.connection_id],
        )
        res.setHeader('Cache-Control', 'no-store')
        return res.json({
          access_token: rotated.token,
          token_type: 'Bearer',
          expires_in: ACCESS_TOKEN_TTL_SECONDS,
          refresh_token: refreshToken,
          scope: OAUTH_SCOPE,
        })
      }

      return oauthError(res, 400, 'unsupported_grant_type', 'Use authorization_code ou refresh_token.')
    } catch (e) {
      console.error('[oauth/token]', e)
      return oauthError(res, 500, 'server_error', 'Erro ao emitir token.')
    }
  })
}
