import type { UserRole } from '../types'

/** Rótulos de produto: hoje usamos owner (gestor) e member (colaborador). "Admin" da plataforma fica fora do escopo. */
export function userRoleLabel(role: UserRole | undefined): string {
  if (role === 'owner') return 'Gestor'
  if (role === 'member') return 'Colaborador'
  return '—'
}
