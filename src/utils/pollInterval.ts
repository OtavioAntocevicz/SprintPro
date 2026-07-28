/** Intervalos de sincronização com o servidor, conforme tamanho da equipe. */
export const POLL_SOLO_MS = 30 * 60 * 1000 // 1 pessoa: 30 min
export const POLL_TEAM_MS = 60 * 1000 // 2+: 1 min

export function pollIntervalForMemberCount(memberCount: number): number {
  return memberCount <= 1 ? POLL_SOLO_MS : POLL_TEAM_MS
}

/** Presença: um pouco mais frequente que o poll de dados, mas ainda adaptativo. */
export function presenceIntervalForMemberCount(memberCount: number): {
  heartbeatMs: number
  fetchMs: number
} {
  if (memberCount <= 1) {
    return { heartbeatMs: 5 * 60 * 1000, fetchMs: POLL_SOLO_MS }
  }
  return { heartbeatMs: 60 * 1000, fetchMs: POLL_TEAM_MS }
}
