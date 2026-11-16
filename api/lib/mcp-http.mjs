import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { z } from 'zod'
import { SprintProClient } from '../../mcp/sprintpro/src/api-client.mjs'
import { createHandlers } from '../../mcp/sprintpro/src/handlers.mjs'
import { registerTools } from '../../mcp/sprintpro/src/tools.mjs'

/**
 * MCP remoto (Streamable HTTP, sem sessão) em /api/mcp.
 * Cada requisição cria um servidor efêmero; as tools chamam a própria API REST
 * com o token da pessoa, então valem as mesmas regras de permissão da API.
 *
 * @param {import('express').Express} app
 * @param {{ authRequired: Function, baseUrlFor: (req) => string }} deps
 */
export function registerMcpRoutes(app, { authRequired, baseUrlFor }) {
  function mcpAuth(req, res, next) {
    // Exigido pela especificação de autorização do MCP: indica onde achar o servidor OAuth.
    res.setHeader(
      'WWW-Authenticate',
      `Bearer resource_metadata="${baseUrlFor(req)}/.well-known/oauth-protected-resource/api/mcp"`,
    )
    authRequired(req, res, () => {
      res.removeHeader('WWW-Authenticate')
      next()
    })
  }

  app.post('/api/mcp', mcpAuth, async (req, res) => {
    const token = String(req.headers.authorization).slice(7)
    const client = new SprintProClient({
      baseUrl: baseUrlFor(req),
      token,
      defaultBoardName: '',
    })
    const server = new McpServer({ name: 'sprintpro', version: '1.0.0' })
    registerTools(server, createHandlers(client), z)
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    })
    res.on('close', () => {
      transport.close().catch(() => {})
      server.close().catch(() => {})
    })
    try {
      await server.connect(transport)
      await transport.handleRequest(req, res, req.body)
    } catch (e) {
      console.error('[mcp]', e)
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Erro interno no MCP.' },
          id: null,
        })
      }
    }
  })

  // Sem sessão: não há stream GET nem encerramento de sessão.
  const methodNotAllowed = (_req, res) => {
    res.setHeader('Allow', 'POST')
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Método não permitido.' },
      id: null,
    })
  }
  app.get('/api/mcp', methodNotAllowed)
  app.delete('/api/mcp', methodNotAllowed)
}
