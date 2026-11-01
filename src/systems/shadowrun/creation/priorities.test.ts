// @vitest-environment node

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe as group, expect, it } from 'vitest'

import type { UiCatalogs } from './catalogs'
import { assign, describe } from './priorities'

const root = fileURLToPath(
  new URL('../../../../test/fixtures/data/systems/shadowrun/5e/', import.meta.url),
)
const read = (name: string) => JSON.parse(readFileSync(join(root, `${name}.json`), 'utf8'))
const c: UiCatalogs = {
  columns: read('priorities').columns,
  rows: read('priorities').rows,
  metatypes: read('metatypes').metatypes,
  attributes: read('attributes').attributes,
  awakenings: read('awakening').awakenings,
}

group('assign', () => {
  it('escolhe uma letra livre', () => {
    expect(assign({ metatype: 'B' }, 'attributes', 'A')).toEqual({ metatype: 'B', attributes: 'A' })
  })

  it('troca com a coluna que já usava a letra', () => {
    expect(assign({ metatype: 'B', attributes: 'A' }, 'metatype', 'A')).toEqual({
      metatype: 'A',
      attributes: 'B',
    })
  })

  it('tira a letra da outra coluna quando a de cá estava vazia', () => {
    expect(assign({ attributes: 'A' }, 'metatype', 'A')).toEqual({ metatype: 'A' })
  })

  it('desfaz ao tocar na escolhida', () => {
    expect(assign({ metatype: 'B' }, 'metatype', 'B')).toEqual({})
  })
})

group('o que cada letra dá', () => {
  it.each([
    ['metatype', 'A', 'Humano 9, elfo 8, anão 7, ork 7 ou troll 5 pontos especiais.'],
    ['metatype', 'E', 'Só humano, com 1 ponto especial.'],
    ['attributes', 'D', '14 pontos de atributo.'],
    ['magic', 'A', 'Mago, adepto místico ou tecnomante 6.'],
    ['magic', 'B', 'Mago, adepto místico ou tecnomante 4; adepto 6; mago aspectado 5.'],
    ['magic', 'E', 'Mundano: sem magia nem ressonância.'],
    ['skills', 'A', '46 pontos de perícia e 10 de grupo.'],
    ['skills', 'D', '22 pontos de perícia, sem pontos de grupo.'],
    ['resources', 'A', '450.000 ¥'],
  ])('%s %s', (column, letter, text) => {
    expect(describe(c, column, letter)).toBe(text)
  })
})
