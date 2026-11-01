import { describe, expect, it } from 'vitest'

import { check, normalize, subset } from './contract'
import type { RulesSystem } from './system'

describe('subset', () => {
  it('aceita chave a mais e acusa chave ausente ou valor diferente', () => {
    expect(subset('d', { a: 1, b: { c: 2 } }, { a: 1, b: { c: 2, x: 0 }, y: 0 })).toEqual([])
    expect(subset('d', { a: 1, b: 2 }, { a: 3 })).toEqual(['d.a: got 3, want 1', 'd.b: ausente'])
  })

  it('exige listas do mesmo tamanho', () => {
    expect(subset('d', [{ a: 1 }], [{ a: 1, b: 2 }])).toEqual([])
    expect(subset('d', [1], [1, 2])).toHaveLength(1)
  })
})

describe('normalize', () => {
  it('ordena por step, path e code e tira params vazio', () => {
    const vs = normalize([
      { step: 'b', path: 'x', code: 'c' },
      { step: 'a', path: 'y', code: 'c', params: {} },
    ])
    expect(vs).toEqual([
      { step: 'a', path: 'y', code: 'c' },
      { step: 'b', path: 'x', code: 'c' },
    ])
  })
})

describe('check', () => {
  const toy: RulesSystem = {
    key: { system: 'toy', version: '1' },
    validate: (_, mode) => (mode === 'strict' ? [{ step: 's', path: 'p', code: 'nope' }] : []),
    derive: () => ({ budgets: { points: { total: 10, spent: 3 } } }),
    summarize: () => ({ title: '', subtitle: 'Toy' }),
  }

  it('acusa código não declarado e divergência de expectativa', () => {
    const problems = check(
      toy,
      {
        name: 'x',
        schemaVersion: 1,
        data: {},
        expect: { strict: [], derived: { budgets: { points: { spent: 4 } } } },
      },
      [],
    )
    expect(problems).toHaveLength(3)
    expect(problems[0]).toContain('código não declarado "nope"')
  })
})
