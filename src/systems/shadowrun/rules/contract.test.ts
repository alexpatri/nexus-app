// @vitest-environment node

import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { check, type Fixture } from '@/core/rules/contract'
import { fixturesRoot, readFixture, shadowrunCatalogs } from '../../../../test/shadowrun'
import { codes, createShadowrun } from './index'

const catalogs = shadowrunCatalogs()
const dir = 'fixtures/shadowrun/5e'
const fixtures = readdirSync(join(fixturesRoot, dir))
  .filter((f) => f.endsWith('.json'))
  .map((f) => readFixture(`${dir}/${f}`) as Fixture)

describe('shadowrun 5e', () => {
  const sys = createShadowrun(catalogs)

  it('acha as fixtures de ficha', () => {
    expect(fixtures.length).toBeGreaterThan(0)
  })

  it('rascunho vazio passa em Lenient', () => {
    expect(sys.validate({}, 'lenient')).toEqual([])
  })

  it.each(fixtures)('$name', (f) => {
    expect(check(sys, f, codes)).toEqual([])
  })

  it('falha na criação com fórmula quebrada no catálogo', () => {
    const broken = structuredClone(catalogs)
    broken.mechanics.derived.limits.physical.value = { ref: 'attr.reaction' }
    expect(() => createShadowrun(broken)).toThrow(expect.objectContaining({ code: 'missingRef' }))
  })
})
