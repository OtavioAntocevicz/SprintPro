import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export const OAUTH_SCOPE = 'sprintpro'
export const CODE_TTL_MS = 5 * 60 * 1000
export const ACCESS_TOKEN_TTL_SECONDS = 365 * 24 * 60 * 60

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url')
}

export function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex')
}

export function safeEqual(a, b) {
  const x = Buffer.from(String(a))
  const y = Buffer.from(String(b))
  return x.length === y.length && timingSafeEqual(x, y)
}

/** PKCE S256: BASE64URL(SHA256(verifier)) === challenge */
export function verifyPkce(verifier, challenge) {
  if (typeof verifier !== 'string' || !/^[A-Za-z0-9\-._~]{43,128}$/.test(verifier)) return false
  const computed = createHash('sha256').update(verifier).digest('base64url')
  return safeEqual(computed, challenge)
}

/** https em qualquer host, ou http só em localhost/127.0.0.1 (clientes locais). */
export function isAllowedRedirectUri(uri) {
  try {
    const u = new URL(uri)
    if (u.hash) return false
    if (u.protocol === 'https:') return true
    if (u.protocol === 'http:') return u.hostname === 'localhost' || u.hostname === '127.0.0.1'
    return false
  } catch {
    return false
  }
}

const AUTH_METHODS = new Set(['none', 'client_secret_post', 'client_secret_basic'])

/** Valida o corpo do registro dinâmico de cliente (RFC 7591). */
export function validateClientRegistration(body) {
  const redirectUris = Array.isArray(body?.redirect_uris) ? body.redirect_uris.map(String) : []
  if (!redirectUris.length || redirectUris.length > 10) {
    return { error: 'invalid_redirect_uri', description: 'Informe de 1 a 10 redirect_uris.' }
  }
  const bad = redirectUris.find((u) => !isAllowedRedirectUri(u))
  if (bad) {
    return { error: 'invalid_redirect_uri', description: `redirect_uri não permitida: ${bad}` }
  }
  const authMethod = String(body?.token_endpoint_auth_method ?? 'none')
  if (!AUTH_METHODS.has(authMethod)) {
    return {
      error: 'invalid_client_metadata',
      description: 'token_endpoint_auth_method deve ser none, client_secret_post ou client_secret_basic.',
    }
  }
  const grantTypes = Array.isArray(body?.grant_types) ? body.grant_types.map(String) : ['authorization_code']
  if (!grantTypes.includes('authorization_code')) {
    return { error: 'invalid_client_metadata', description: 'grant_types deve incluir authorization_code.' }
  }
  const clientName = String(body?.client_name ?? '').trim().slice(0, 100) || 'Cliente MCP'
  return { redirectUris, authMethod, grantTypes, clientName }
}

/**
 * Valida os parâmetros de /authorize contra o cliente registrado.
 * Erros com `redirect: false` não podem voltar ao redirect_uri (cliente/URI inválidos).
 */
export function validateAuthorizeParams(params, client) {
  if (!client) return { error: 'invalid_client', description: 'client_id desconhecido.', redirect: false }
  const redirectUri = String(params.redirect_uri ?? '')
  if (!client.redirect_uris.includes(redirectUri)) {
    return { error: 'invalid_request', description: 'redirect_uri não registrada para este cliente.', redirect: false }
  }
  if (params.response_type !== 'code') {
    return { error: 'unsupported_response_type', description: 'Use response_type=code.', redirect: true }
  }
  if (!params.code_challenge || params.code_challenge_method !== 'S256') {
    return { error: 'invalid_request', description: 'PKCE S256 é obrigatório.', redirect: true }
  }
  return { ok: true, redirectUri }
}

export function buildRedirect(redirectUri, query) {
  const u = new URL(redirectUri)
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v))
  }
  return u.toString()
}

/** Lê credenciais do cliente do header Basic ou do corpo (client_secret_post). */
export function readClientCredentials(req) {
  const h = String(req.headers?.authorization ?? '')
  if (h.startsWith('Basic ')) {
    const decoded = Buffer.from(h.slice(6), 'base64').toString('utf8')
    const i = decoded.indexOf(':')
    if (i > 0) {
      return {
        clientId: decodeURIComponent(decoded.slice(0, i)),
        clientSecret: decodeURIComponent(decoded.slice(i + 1)),
      }
    }
  }
  return {
    clientId: req.body?.client_id ? String(req.body.client_id) : '',
    clientSecret: req.body?.client_secret ? String(req.body.client_secret) : '',
  }
}

export function protectedResourceMetadata(baseUrl) {
  return {
    resource: `${baseUrl}/api/mcp`,
    authorization_servers: [baseUrl],
    scopes_supported: [OAUTH_SCOPE],
    bearer_methods_supported: ['header'],
    resource_name: 'SprintPro',
  }
}

export function authorizationServerMetadata(baseUrl) {
  return {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/api/oauth/authorize`,
    token_endpoint: `${baseUrl}/api/oauth/token`,
    registration_endpoint: `${baseUrl}/api/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
    scopes_supported: [OAUTH_SCOPE],
  }
}
