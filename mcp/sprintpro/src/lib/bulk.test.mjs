import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { planBulkTasks } from './bulk.mjs'

const self = { id: 'u1', fullName: 'Ana Silva', email: 'ana@co.com' }
const members = [
  self,
  { id: 'u2', fullName: 'Bruno Costa', email: 'bruno@co.com' },
  { id: 'u3', fullName: 'Bruna Lima', email: 'bruna@co.com' },
]
const boards = [
  { id: 'b1', name: 'Geral' },
  { id: 'b2', name: 'Comercial' },
]

describe('planBulkTasks', () => {
  it('resolve quadro, responsável e campos opcionais', () => {
    const { plan, errors } = planBulkTasks({
      tasks: [
        { title: 'Enviar proposta', board: 'comercial', assignee: 'Bruno', priority: 'high', dueDate: '2026-11-20' },
        { title: 'Revisar contrato' },
      ],
      boards,
      members,
      selfUser: self,
      defaultBoard: 'Geral',
    })
    assert.equal(errors.length, 0)
    assert.equal(plan.length, 2)
    assert.deepEqual(plan[0].body, {
      boardId: 'b2',
      title: 'Enviar proposta',
      description: '',
      assignedTo: 'u2',
      assigneeName: 'Bruno Costa',
      priority: 'high',
      dueDate: '2026-11-20',
    })
    assert.equal(plan[1].body.boardId, 'b1')
    assert.equal(plan[1].body.assignedTo, 'u1')
  })

  it('reporta responsável ambíguo com candidatos', () => {
    const { plan, errors } = planBulkTasks({
      tasks: [{ title: 'Ligar cliente', board: 'Geral', assignee: 'Brun' }],
      boards,
      members,
      selfUser: self,
    })
    assert.equal(plan.length, 0)
    assert.equal(errors[0].index, 0)
    assert.equal(errors[0].candidates.length, 2)
  })

  it('rejeita título vazio, data e prioridade inválidas', () => {
    const { errors } = planBulkTasks({
      tasks: [
        { title: '  ', board: 'Geral' },
        { title: 'A', board: 'Geral', dueDate: '20/11/2026' },
        { title: 'B', board: 'Geral', priority: 'urgente' },
      ],
      boards,
      members,
      selfUser: self,
    })
    assert.deepEqual(errors.map((e) => e.index), [0, 1, 2])
  })

  it('exige ao menos uma tarefa', () => {
    const { errors } = planBulkTasks({ tasks: [], boards, members, selfUser: self })
    assert.equal(errors.length, 1)
  })
})
