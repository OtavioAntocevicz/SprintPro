import { describe, expect, it } from 'vitest'
import { dueTone } from './taskDue'

const today = new Date(2026, 10, 16)

describe('dueTone', () => {
  it('sem prazo', () => {
    expect(dueTone({ dueDate: undefined, status: 'todo' }, today)).toBe('none')
  })
  it('atrasada', () => {
    expect(dueTone({ dueDate: '2026-11-15', status: 'doing' }, today)).toBe('overdue')
  })
  it('vence hoje', () => {
    expect(dueTone({ dueDate: '2026-11-16', status: 'todo' }, today)).toBe('today')
  })
  it('próximos 3 dias', () => {
    expect(dueTone({ dueDate: '2026-11-19', status: 'todo' }, today)).toBe('soon')
  })
  it('mais distante', () => {
    expect(dueTone({ dueDate: '2026-11-25', status: 'todo' }, today)).toBe('later')
  })
  it('concluída nunca fica atrasada', () => {
    expect(dueTone({ dueDate: '2026-11-01', status: 'done' }, today)).toBe('later')
  })
})
