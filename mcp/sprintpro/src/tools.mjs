import { toolResultFromHandler } from './handlers.mjs'

/**
 * Registra as tools sprintpro_* num McpServer.
 * Compartilhado entre o MCP local (stdio, src/index.mjs) e o remoto (HTTP, api/lib/mcp-http.mjs).
 * `z` é recebido por parâmetro para usar o zod instalado em quem chama (mcp/ ou api/).
 */
export function registerTools(server, handlers, z) {
  const matchStrategySchema = z.enum(['ask', 'newest']).optional()
  const prioritySchema = z.enum(['low', 'medium', 'high']).optional()
  const statusSchema = z.enum(['todo', 'doing', 'done']).optional()
  const scopeSchema = z.enum(['board', 'organization', 'completed'])

  const register = (name, description, inputSchema, handler) => {
    server.registerTool(name, { description, inputSchema }, async (args) =>
      toolResultFromHandler(await handler(args ?? {})),
    )
  }

  register(
    'sprintpro_whoami',
    'Retorna o usuário autenticado e a organização SprintPro.',
    z.object({}),
    handlers.whoami,
  )

  register('sprintpro_list_boards', 'Lista quadros (boards) da organização.', z.object({}), handlers.list_boards)

  register(
    'sprintpro_create_board',
    'Cria um novo quadro na organização.',
    z.object({ name: z.string().describe('Nome do quadro') }),
    handlers.create_board,
  )

  register(
    'sprintpro_list_members',
    'Lista membros da organização (para atribuir responsáveis).',
    z.object({}),
    handlers.list_members,
  )

  register(
    'sprintpro_resolve_assignee',
    'Resolve nome/e-mail/“eu” para um membro da equipe.',
    z.object({ query: z.string().describe('Nome parcial, e-mail ou "eu"') }),
    handlers.resolve_assignee,
  )

  register(
    'sprintpro_list_categories',
    'Lista categorias de tarefa da organização.',
    z.object({}),
    handlers.list_categories,
  )

  register(
    'sprintpro_list_tasks',
    'Lista tarefas com filtros (quadro, status, responsável, busca, prazo).',
    z.object({
      scope: scopeSchema,
      board: z.string().optional().describe('Nome ou UUID do quadro (obrigatório se scope=board)'),
      status: statusSchema,
      assignee: z.string().optional(),
      priority: prioritySchema,
      label: z.string().optional(),
      search: z.string().optional(),
      dueBefore: z.string().optional().describe('YYYY-MM-DD'),
      dueAfter: z.string().optional().describe('YYYY-MM-DD'),
      onlyFavorites: z.boolean().optional(),
      limit: z.number().int().min(1).max(200).optional(),
    }),
    handlers.list_tasks,
  )

  register(
    'sprintpro_get_task',
    'Detalhes de uma tarefa e suas anotações.',
    z.object({
      taskId: z.string().uuid().optional(),
      taskHint: z.string().optional().describe('Parte do título se não tiver taskId'),
      board: z.string().optional(),
      matchStrategy: matchStrategySchema,
    }),
    handlers.get_task,
  )

  register(
    'sprintpro_create_task',
    'Cria tarefa no quadro (responsável padrão: você).',
    z.object({
      title: z.string(),
      board: z.string().optional(),
      description: z.string().optional(),
      assignee: z.string().optional(),
      priority: prioritySchema,
      dueDate: z.string().optional().describe('YYYY-MM-DD'),
      label: z.string().optional(),
    }),
    handlers.create_task,
  )

  register(
    'sprintpro_create_tasks_bulk',
    'Cria várias tarefas de uma vez (ex.: itens de uma reunião). Valida todas antes: se alguma tiver quadro/responsável inválido ou ambíguo, nada é criado e os erros voltam com candidatos. Use dryRun=true para conferir sem criar.',
    z.object({
      tasks: z
        .array(
          z.object({
            title: z.string(),
            board: z.string().optional().describe('Nome ou UUID; padrão: defaultBoard'),
            description: z.string().optional(),
            assignee: z.string().optional().describe('Nome, e-mail ou "eu" (padrão)'),
            priority: prioritySchema,
            dueDate: z.string().optional().describe('YYYY-MM-DD'),
            label: z.string().optional(),
          }),
        )
        .min(1)
        .max(50),
      defaultBoard: z.string().optional().describe('Quadro usado quando a tarefa não informa'),
      dryRun: z.boolean().optional().describe('true = só valida e mostra o plano'),
    }),
    handlers.create_tasks_bulk,
  )

  register(
    'sprintpro_update_task',
    'Atualiza tarefa (status, título, prazo, responsável, etc.).',
    z.object({
      taskId: z.string().uuid().optional(),
      taskHint: z.string().optional(),
      board: z.string().optional(),
      matchStrategy: matchStrategySchema,
      title: z.string().optional(),
      description: z.string().optional(),
      status: statusSchema,
      priority: prioritySchema.nullable().optional(),
      dueDate: z.string().nullable().optional(),
      label: z.string().optional(),
      assignee: z.string().optional(),
      favorite: z.boolean().optional(),
    }),
    handlers.update_task,
  )

  register(
    'sprintpro_add_task_note',
    'Adiciona anotação em uma tarefa.',
    z.object({
      taskId: z.string().uuid().optional(),
      taskHint: z.string().optional(),
      board: z.string().optional(),
      matchStrategy: matchStrategySchema,
      content: z.string(),
    }),
    handlers.add_task_note,
  )

  register(
    'sprintpro_complete_task',
    'Marca tarefa como concluída; opcionalmente adiciona anotação.',
    z.object({
      taskId: z.string().uuid().optional(),
      taskHint: z.string().optional(),
      board: z.string().optional(),
      matchStrategy: matchStrategySchema,
      note: z.string().optional(),
    }),
    handlers.complete_task,
  )

  register(
    'sprintpro_summarize_workload',
    'Resumo de pendências (a fazer, em progresso, atrasadas, vence hoje, favoritas).',
    z.object({
      assignee: z.string().optional().describe('Padrão: eu'),
      board: z.string().optional(),
    }),
    handlers.summarize_workload,
  )
}
