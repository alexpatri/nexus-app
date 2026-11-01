import { describe, expect, it } from 'vitest'

import { character } from './testing'
import { sortForList } from './order'

describe('sortForList', () => {
  it('põe rascunhos antes das prontas e o mais recente primeiro em cada grupo', () => {
    const list = [
      character({ id: 'pronta-velha', status: 'ready', updatedAt: '2026-10-01T00:00:00Z' }),
      character({ id: 'rascunho-velho', updatedAt: '2026-10-02T00:00:00Z' }),
      character({ id: 'pronta-nova', status: 'ready', updatedAt: '2026-10-30T00:00:00Z' }),
      character({ id: 'rascunho-novo', updatedAt: '2026-10-29T00:00:00Z' }),
    ]
    expect(sortForList(list).map((c) => c.id)).toEqual([
      'rascunho-novo',
      'rascunho-velho',
      'pronta-nova',
      'pronta-velha',
    ])
  })
})
