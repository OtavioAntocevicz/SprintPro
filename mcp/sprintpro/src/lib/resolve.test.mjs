import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveAssignee, resolveBoard, resolveTaskByHint } from './resolve.mjs'

const self = { id: 'u1', fullName: 'Ana Silva', email: 'ana@co.com' }
const members = [self, { id: 'u2', fullName: 'Bruno', email: 'bruno@co.com' }]
const boards = [
  { id: 'b1', name: 'Geral' },
  { id: 'b2', name: 'Comercial' },
]

describe('resolveAssignee', () => {
  it('resolve eu/mim', () => {
    const r = resolveAssignee(members, 'eu', self)
    assert.equal(r.member.id, 'u1')
  })
  it('resolve por e-mail parcial', () => {
    const r = resolveAssignee(members, 'bruno@', self)
    assert.equal(r.member.id, 'u2')
  })
})

describe('resolveBoard', () => {
  it('usa único quadro quando não informado', () => {
    const r = resolveBoard([boards[0]], '', '')
    assert.equal(r.board.id, 'b1')
  })
  it('ambiguidade em nome parcial', () => {
    const many = [
      { id: 'b1', name: 'Comercial Norte' },
      { id: 'b2', name: 'Comercial Sul' },
    ]
    const r = resolveBoard(many, 'comercial', '')
    assert.equal(r.ambiguous, true)
  })
})

describe('resolveTaskByHint', () => {
  const tasks = [
    { id: 't1', title: 'DNS Cloudflare', createdAt: '2024-01-01' },
    { id: 't2', title: 'DNS Vercel', createdAt: '2025-01-01' },
  ]
  it('newest escolhe mais recente', () => {
    const r = resolveTaskByHint(tasks, 'dns', 'newest')
    assert.equal(r.task.id, 't2')
  })
})
