import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { filterTasks, summarizeForAssignee } from './filters.mjs'

const self = { id: 'u1', fullName: 'Ana', email: 'ana@test.com' }
const members = [self, { id: 'u2', fullName: 'Bruno', email: 'bruno@test.com' }]

const tasks = [
  {
    id: '1',
    title: 'Deploy produção',
    description: 'DNS',
    status: 'todo',
    assignedTo: 'u1',
    dueDate: '2020-01-01',
    favorite: true,
    priority: 'high',
    label: 'Infra',
  },
  {
    id: '2',
    title: 'Revisar contrato',
    status: 'doing',
    assignedTo: 'u2',
    dueDate: '2099-12-31',
    favorite: false,
  },
]

describe('filterTasks', () => {
  it('filtra por busca e responsável', () => {
    const { tasks: out, totalMatched } = filterTasks(tasks, {
      search: 'deploy',
      assignee: 'eu',
      limit: 10,
    }, self, members)
    assert.equal(totalMatched, 1)
    assert.equal(out[0].id, '1')
  })
})

describe('summarizeForAssignee', () => {
  it('agrupa pendências do usuário', () => {
    const s = summarizeForAssignee(tasks, 'u1')
    assert.equal(s.todo.length, 1)
    assert.equal(s.overdue.length, 1)
    assert.equal(s.favorites.length, 1)
  })
})
