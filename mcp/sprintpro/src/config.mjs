import dotenv from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '..', '..', '.env') })
dotenv.config({ path: join(__dirname, '..', '..', '..', '.env.local') })
dotenv.config({ path: join(__dirname, '..', '.env') })
dotenv.config({ path: join(__dirname, '..', '.env.local') })

export function loadConfig() {
  const baseUrl = (process.env.SPRINTPRO_API_URL || 'http://127.0.0.1:8787').replace(/\/$/, '')
  const token = process.env.SPRINTPRO_TOKEN || process.env.SPRINTPRO_API_TOKEN || ''
  const defaultBoardName = process.env.SPRINTPRO_DEFAULT_BOARD_NAME || ''
  if (!token) {
    throw new Error(
      'Defina SPRINTPRO_TOKEN no .env (gere com: npm run mcp:token -- seu@email.com)',
    )
  }
  return { baseUrl, token, defaultBoardName }
}
