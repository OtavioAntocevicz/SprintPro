import { describe, expect, it } from 'vitest'
import { defaultTaskFilters, filterTasks } from './filterTasks'
import type { Task } from '../types'

const baseTask: Task = {
  id: '1',
  title: 'Implementar login',
  description: 'Fluxo de autenticação',
  status: 'todo',
  boardId: 'b1',
  organizationId: 'o1',
  label: 'Backend',
  priority: 'high',
  dueDate: '2026-12-01',
  assigneeName: 'Ana',
  assignedTo: 'u1',
  createdAt: '2026-01-01T00:00:00.000Z',
}

describe('filterTasks', () => {
  it('filtra por texto na busca', () => {
    const result = filterTasks([baseTask], { ...defaultTaskFilters, query: 'login' })
    expect(result).toHaveLength(1)
    expect(filterTasks([baseTask], { ...defaultTaskFilters, query: 'inexistente' })).toHaveLength(0)
  })

  it('filtra por categoria', () => {
    const result = filterTasks([baseTask], { ...defaultTaskFilters, label: 'Backend' })
    expect(result).toHaveLength(1)
    expect(filterTasks([baseTask], { ...defaultTaskFilters, label: 'Design' })).toHaveLength(0)
  })

  it('filtra por responsável', () => {
    const result = filterTasks([baseTask], { ...defaultTaskFilters, assigneeId: 'u1' })
    expect(result).toHaveLength(1)
  })
})
