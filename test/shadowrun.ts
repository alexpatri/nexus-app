// Catálogos do Shadowrun baixados por `npm run fixtures`, para os testes.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { buildUiCatalogs, type RawCatalogs } from '@/systems/shadowrun/creation/catalogs'

export const fixturesRoot = join(process.cwd(), 'test/fixtures')

export function readFixture(path: string): unknown {
  return JSON.parse(readFileSync(join(fixturesRoot, path), 'utf8'))
}

const names = [
  'system',
  'metatypes',
  'priorities',
  'mechanics',
  'attributes',
  'awakening',
  'qualities',
  'skills',
  'mentors',
  'traditions',
  'adept-powers',
  'complex-forms',
  'spells',
]

export function shadowrunCatalogs(): RawCatalogs {
  return Object.fromEntries(
    names.map((n) => [n, readFixture(`data/systems/shadowrun/5e/${n}.json`)]),
  ) as unknown as RawCatalogs
}

export const shadowrunUi = () => buildUiCatalogs(shadowrunCatalogs())
