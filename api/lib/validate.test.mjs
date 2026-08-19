import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isStrongPassword } from './validate.mjs'

describe('isStrongPassword', () => {
  it('aceita senha com letras e números', () => {
    assert.equal(isStrongPassword('Senha123'), true)
  })

  it('rejeita senha curta', () => {
    assert.equal(isStrongPassword('Ab1'), false)
  })

  it('rejeita senha sem número', () => {
    assert.equal(isStrongPassword('SenhaForte'), false)
  })
})
