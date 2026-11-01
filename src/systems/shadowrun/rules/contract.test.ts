// @vitest-environment node

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { check, type Fixture } from '@/core/rules/contract'
import type { Catalogs } from './catalogs'
import { codes, createShadowrun } from './index'

// Baixadas por `npm run fixtures`, na tag de package.json (nexus.systems).
const root = fileURLToPath(new URL('../../../../test/fixtures/', import.meta.url))
const readJson = (path: string): unknown => JSON.parse(readFileSync(join(root, path), 'utf8'))

const catalog = (name: string) => readJson(`data/systems/shadowrun/5e/${name}.json`)
const catalogs = {
  system: catalog('system'),
  metatypes: catalog('metatypes'),
  priorities: catalog('priorities'),
  mechanics: catalog('mechanics'),
} as Catalogs

const dir = 'fixtures/shadowrun/5e'
const fixtures = readdirSync(join(root, dir))
  .filter((f) => f.endsWith('.json'))
  .map((f) => readJson(`${dir}/${f}`) as Fixture)

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
