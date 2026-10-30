import { describe, expect, it } from 'vitest'

import { contrast } from './color'
import type { Theme } from './contract'
import { themes } from './themes'

type Pair = [keyof Theme['color'], keyof Theme['color'], number]

// WCAG 2.2 AA: 4,5 para texto, 3 para componente de interface.
const pairs: Pair[] = [
  ['text', 'surface', 4.5],
  ['text', 'surfaceRaised', 4.5],
  ['text', 'surfaceSunken', 4.5],
  ['textMuted', 'surface', 4.5],
  ['textMuted', 'surfaceRaised', 4.5],
  ['onAccent', 'accent', 4.5],
  ['onDanger', 'danger', 4.5],
  ['accent', 'surface', 4.5],
  ['danger', 'surface', 4.5],
  ['border', 'surface', 3],
  ['focus', 'surface', 3],
]

describe.each(Object.entries(themes))('tema %s', (_, theme) => {
  it.each(pairs)('%s sobre %s ≥ %d', (fg, bg, min) => {
    expect(contrast(theme.color[fg], theme.color[bg])).toBeGreaterThanOrEqual(min)
  })
})

describe('contrast', () => {
  it('bate com os valores da spec do Nexus', () => {
    expect(contrast('#1E2126', '#F6F6F4')).toBeCloseTo(14.9, 1)
    expect(contrast('#5B6068', '#FFFFFF')).toBeCloseTo(6.3, 1)
    expect(contrast('#D9DAD6', '#F6F6F4')).toBeCloseTo(1.3, 1)
  })

  it('é 21 entre preto e branco', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
  })
})
