const STORAGE_PREFIX = 'sprintpro:lastAssignee:'

export function getLastAssigneeId(organizationId: string): string | null {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${organizationId}`)
  } catch {
    return null
  }
}

export function setLastAssigneeId(organizationId: string, assigneeId: string) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${organizationId}`, assigneeId)
  } catch {
    // ignore quota / private mode
  }
}

/** Escolhe o responsável padrão: único membro, ou o último usado se ainda existir na org. */
export function resolveDefaultAssigneeId(
  members: { id: string }[],
  organizationId: string | undefined,
  fallbackUserId?: string,
): string {
  if (members.length === 0) return ''
  if (members.length === 1) return members[0].id

  const lastId = organizationId ? getLastAssigneeId(organizationId) : null
  if (lastId && members.some((m) => m.id === lastId)) return lastId

  if (fallbackUserId && members.some((m) => m.id === fallbackUserId)) return fallbackUserId

  return members[0].id
}
