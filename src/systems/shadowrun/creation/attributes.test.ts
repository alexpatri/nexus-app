import { describe, expect, it } from 'vitest'

import { pointsOf, setPoints } from './attributes'

describe('setPoints', () => {
  it('grava os pontos sem mexer no carma', () => {
    const data: Record<string, unknown> = { attributes: { edg: { karma: 1 } } }
    setPoints(data, 'edg', 2)
    expect(data.attributes).toEqual({ edg: { karma: 1, points: 2 } })
    expect(pointsOf(data, 'edg')).toBe(2)
  })

  it('zero some do data, até a seção inteira', () => {
    const data: Record<string, unknown> = { attributes: { bod: { points: 1 } } }
    setPoints(data, 'bod', 0)
    expect(data).toEqual({})
  })
})
