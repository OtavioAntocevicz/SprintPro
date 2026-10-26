# MCP SprintPro

Servidor [Model Context Protocol](https://modelcontextprotocol.io) para o SprintPro: o agente (Cursor, GrokBot, etc.) cria e gerencia tarefas por linguagem natural.

## Setup rápido

### Só na nuvem (recomendado)

1. Acesse o SprintPro em produção → **Configurações** → **Segurança** → **Gerar token do agente**.
2. Copie o token para `SPRINTPRO_TOKEN` no MCP do Cursor/GrokBot.
3. Use `SPRINTPRO_API_URL=https://sprintpro.vercel.app` (ou seu domínio).

### Com máquina local (opcional)

1. Na **raiz** do repositório: `npm run mcp:install`
2. `npm run mcp:token -- seu@email.com`
3. Coloque no `.env` da raiz (ou nas env vars do host do agente):

   ```env
   SPRINTPRO_TOKEN=<token gerado>
   SPRINTPRO_API_URL=http://127.0.0.1:8787
   SPRINTPRO_DEFAULT_BOARD_NAME=Geral
   ```

4. Suba a API (`npm run api` ou `npm run dev:all`).

## Cursor / GrokBot

Adicione o servidor MCP nas configurações do cliente (ex.: **Cursor Settings → MCP**):

```json
{
  "mcpServers": {
    "sprintpro": {
      "command": "node",
      "args": ["/CAMINHO_ABSOLUTO/para/sprintpro/mcp/sprintpro/src/index.mjs"],
      "env": {
        "SPRINTPRO_TOKEN": "cole_o_token_aqui",
        "SPRINTPRO_API_URL": "https://seu-dominio.vercel.app",
        "SPRINTPRO_DEFAULT_BOARD_NAME": "Geral"
      }
    }
  }
}
```

Em produção, use a URL pública da API (mesmo domínio do frontend com `/api` ou subdomínio dedicado).

## Tools expostas

| Tool | Função |
|------|--------|
| `sprintpro_whoami` | Sessão e organização |
| `sprintpro_list_boards` | Quadros |
| `sprintpro_create_board` | Novo quadro |
| `sprintpro_list_members` | Equipe |
| `sprintpro_resolve_assignee` | Nome/e-mail → membro |
| `sprintpro_list_categories` | Categorias |
| `sprintpro_list_tasks` | Listar com filtros |
| `sprintpro_get_task` | Detalhe + notas |
| `sprintpro_create_task` | Criar tarefa |
| `sprintpro_update_task` | Editar / mover coluna |
| `sprintpro_add_task_note` | Anotação |
| `sprintpro_complete_task` | Concluir (+ nota opcional) |
| `sprintpro_summarize_workload` | Resumo do dia |

Respostas JSON: `{ "ok": true, "data": ... }` ou `{ "ok": false, "error": "..." }`.

## Testes

```bash
npm test --prefix mcp/sprintpro
```

## Prompt sugerido para o agente

Você é o assistente SprintPro. Use as tools `sprintpro_*` para executar pedidos do usuário. Se faltar quadro, use `SPRINTPRO_DEFAULT_BOARD_NAME` ou pergunte uma vez. Responsável padrão: o usuário da sessão (`sprintpro_whoami`). Se várias tarefas ou membros coincidirem, liste candidatos e não altere em massa. Após criar ou concluir, confirme título, quadro, status, responsável e prazo.
