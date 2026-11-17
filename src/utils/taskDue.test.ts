import { describe, expect, it } from 'vitest'
import { dueTone, relativeDueLabel } from './taskDue'

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

describe('relativeDueLabel', () => {
  const t = (dueDate: string, status: 'todo' | 'done' = 'todo') => relativeDueLabel({ dueDate, status }, today)
  it('hoje, amanhã, ontem', () => {
    expect(t('2026-11-16')).toBe('Hoje')
    expect(t('2026-11-17')).toBe('Amanhã')
    expect(t('2026-11-15')).toBe('Ontem')
  })
  it('dias à frente e atrasados', () => {
    expect(t('2026-11-19')).toBe('Em 3 dias')
    expect(t('2026-11-13')).toBe('3 dias atrasada')
  })
  it('data distante ou tarefa concluída mostra a data', () => {
    expect(t('2026-12-25')).not.toMatch(/^Em /)
    expect(t('2026-11-16', 'done')).not.toBe('Hoje')
  })
})
