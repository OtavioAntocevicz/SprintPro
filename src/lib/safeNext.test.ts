import { describe, expect, it } from 'vitest'
import { safeNext } from './safeNext'

describe('safeNext', () => {
  it('aceita caminho interno com query', () => {
    expect(safeNext('/oauth/authorize?client_id=x')).toBe('/oauth/authorize?client_id=x')
  })
  it('rejeita URL externa e protocol-relative', () => {
    expect(safeNext('https://evil.com')).toBe('/dashboard')
    expect(safeNext('//evil.com')).toBe('/dashboard')
    expect(safeNext('/\\evil.com')).toBe('/dashboard')
  })
  it('usa fallback quando vazio', () => {
    expect(safeNext(null)).toBe('/dashboard')
  })
})
