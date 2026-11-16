import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  authorizationServerMetadata,
  buildRedirect,
  isAllowedRedirectUri,
  protectedResourceMetadata,
  readClientCredentials,
  validateAuthorizeParams,
  validateClientRegistration,
  verifyPkce,
} from './oauth.mjs'

const verifier = 'a'.repeat(43) + '-._~XYZ'
const challenge = createHash('sha256').update(verifier).digest('base64url')
const client = { client_id: 'spc_1', redirect_uris: ['https://claude.ai/api/mcp/auth_callback'] }
const goodParams = {
  client_id: 'spc_1',
  redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
  response_type: 'code',
  code_challenge: challenge,
  code_challenge_method: 'S256',
  state: 'xyz',
}

describe('verifyPkce', () => {
  it('aceita verifier correto', () => assert.equal(verifyPkce(verifier, challenge), true))
  it('rejeita verifier errado ou curto', () => {
    assert.equal(verifyPkce('b'.repeat(43), challenge), false)
    assert.equal(verifyPkce('curto', challenge), false)
    assert.equal(verifyPkce(undefined, challenge), false)
  })
})

describe('isAllowedRedirectUri', () => {
  it('https e localhost http', () => {
    assert.equal(isAllowedRedirectUri('https://claude.ai/cb'), true)
    assert.equal(isAllowedRedirectUri('http://localhost:6274/cb'), true)
  })
  it('bloqueia http externo, fragmento e esquemas estranhos', () => {
    assert.equal(isAllowedRedirectUri('http://evil.com/cb'), false)
    assert.equal(isAllowedRedirectUri('https://claude.ai/cb#x'), false)
    assert.equal(isAllowedRedirectUri('javascript:alert(1)'), false)
  })
})

describe('validateClientRegistration', () => {
  it('registro público padrão', () => {
    const r = validateClientRegistration({ redirect_uris: ['https://claude.ai/cb'], client_name: 'Claude' })
    assert.equal(r.authMethod, 'none')
    assert.equal(r.clientName, 'Claude')
  })
  it('rejeita sem redirect_uris ou com método inválido', () => {
    assert.equal(validateClientRegistration({}).error, 'invalid_redirect_uri')
    assert.equal(
      validateClientRegistration({ redirect_uris: ['https://a.com'], token_endpoint_auth_method: 'private_key_jwt' }).error,
      'invalid_client_metadata',
    )
  })
})

describe('validateAuthorizeParams', () => {
  it('ok com PKCE S256', () => assert.equal(validateAuthorizeParams(goodParams, client).ok, true))
  it('cliente desconhecido ou redirect diferente não redireciona', () => {
    assert.equal(validateAuthorizeParams(goodParams, null).redirect, false)
    const r = validateAuthorizeParams({ ...goodParams, redirect_uri: 'https://evil.com/cb' }, client)
    assert.equal(r.redirect, false)
  })
  it('sem PKCE ou response_type errado volta ao cliente com erro', () => {
    assert.equal(validateAuthorizeParams({ ...goodParams, code_challenge_method: 'plain' }, client).redirect, true)
    assert.equal(validateAuthorizeParams({ ...goodParams, response_type: 'token' }, client).error, 'unsupported_response_type')
  })
})

describe('helpers', () => {
  it('buildRedirect preserva query existente e ignora vazios', () => {
    const u = new URL(buildRedirect('https://a.com/cb?x=1', { code: 'c', state: undefined }))
    assert.equal(u.searchParams.get('x'), '1')
    assert.equal(u.searchParams.get('code'), 'c')
    assert.equal(u.searchParams.has('state'), false)
  })
  it('readClientCredentials lê Basic e corpo', () => {
    const basic = Buffer.from('spc_1:segredo').toString('base64')
    assert.deepEqual(readClientCredentials({ headers: { authorization: `Basic ${basic}` }, body: {} }), {
      clientId: 'spc_1',
      clientSecret: 'segredo',
    })
    assert.equal(readClientCredentials({ headers: {}, body: { client_id: 'spc_2' } }).clientId, 'spc_2')
  })
  it('metadados apontam para o mesmo host', () => {
    const base = 'https://sprintpro.vercel.app'
    assert.equal(protectedResourceMetadata(base).resource, `${base}/api/mcp`)
    const as = authorizationServerMetadata(base)
    assert.equal(as.issuer, base)
    assert.deepEqual(as.code_challenge_methods_supported, ['S256'])
  })
})
