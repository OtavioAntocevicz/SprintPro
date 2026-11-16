# Plugin SprintPro para o Claude

Comando **`/sprintpro`**: cole as notas do Granola de uma reunião e o Claude extrai as tarefas, mostra uma prévia (responsável, quadro, prazo, prioridade) e, depois da sua confirmação, cria tudo no SprintPro de uma vez.

O plugin traz:

- **Skill `sprintpro`**: as regras de extração e o fluxo prévia → confirmação → criação.
- **MCP `sprintpro`**: o servidor do SprintPro já empacotado em um arquivo (`server/sprintpro-mcp.mjs`), sem `npm install`.

## Requisitos

- Claude desktop (aba Code) ou Claude Code.
- [Node.js](https://nodejs.org) 20 ou mais novo.
- Uma conta no SprintPro.

## Instalação (cada pessoa do time)

1. **Gere seu token**: SprintPro → **Configurações → Conexões MCP → Nova conexão** (ex.: "Claude"). Copie o token, ele aparece uma vez só.
2. **Salve o token** como variável de ambiente do seu usuário (PowerShell):

   ```powershell
   [Environment]::SetEnvironmentVariable("SPRINTPRO_TOKEN", "cole_o_token_aqui", "User")
   ```

   Opcional: `SPRINTPRO_DEFAULT_BOARD_NAME` (quadro padrão) e `SPRINTPRO_API_URL` (padrão `https://sprintpro.vercel.app`).
3. **Instale o plugin** no Claude Code:

   ```
   /plugin marketplace add OtavioAntocevicz/SprintPro
   /plugin install sprintpro@sprintpro
   ```

   (ou instale pelo catálogo de plugins da organização, se ele tiver sido publicado lá).
4. Feche e abra o Claude de novo.

## Uso

```
/sprintpro <cole aqui as notas do Granola>
```

Ajuste a prévia em linguagem natural ("a 2 é do Bruno", "tira a 4", "tudo no quadro Comercial") e confirme.

## Manutenção

O arquivo `server/sprintpro-mcp.mjs` é gerado a partir de `mcp/sprintpro/src`. Depois de mudar o MCP, gere de novo:

```bash
npm run bundle --prefix mcp/sprintpro
```
