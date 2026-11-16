#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { loadConfig } from './config.mjs'
import { SprintProClient } from './api-client.mjs'
import { createHandlers } from './handlers.mjs'
import { registerTools } from './tools.mjs'

async function main() {
  const config = loadConfig()
  const client = new SprintProClient(config)
  const handlers = createHandlers(client)

  const server = new McpServer({
    name: 'sprintpro',
    version: '1.0.0',
  })
  registerTools(server, handlers, z)

  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  console.error('[sprintpro-mcp]', err)
  process.exit(1)
})
