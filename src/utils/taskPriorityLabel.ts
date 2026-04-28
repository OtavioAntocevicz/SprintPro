export function taskPriorityLabel(priority: 'low' | 'medium' | 'high' | undefined) {
  if (priority === 'low') return 'Baixa'
  if (priority === 'medium') return 'Média'
  if (priority === 'high') return 'Alta'
  return ''
}
