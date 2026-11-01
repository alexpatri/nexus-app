// @vitest-environment node

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { follow, parsePointer } from '@/core/catalog/loader'
import { type Env, evaluate, ExprError } from './expr'

// Baixadas por `npm run fixtures`, na tag de package.json (nexus.systems).
const root = fileURLToPath(new URL('../../../test/fixtures/', import.meta.url))
const system = 'shadowrun/5e'

interface CaseFile {
  name: string
  envs?: Record<string, Env>
  cases: Case[]
}

interface Case {
  name: string
  expr?: unknown
  formula?: string
  base?: string
  env?: Env
  want?: number
  error?: string
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(join(root, path), 'utf8'))
}

function formula(pointer: string): unknown {
  const { file, path } = parsePointer(pointer)
  return follow(readJson(`data/systems/${system}/${file}`), path, pointer)
}

const dir = `fixtures/${system}/expr`
const files = readdirSync(join(root, dir)).filter((f) => f.endsWith('.json'))

it('acha as fixtures do avaliador', () => {
  expect(files.length).toBeGreaterThan(0)
})

const suites = files.map((f) => readJson(`${dir}/${f}`) as CaseFile)

describe.each(suites)('$name', (suite) => {
  const env = (c: Case) => ({ ...suite.envs?.[c.base ?? ''], ...c.env })
  const node = (c: Case) => (c.formula ? formula(c.formula) : c.expr)
  const values = suite.cases.filter((c) => c.error === undefined)
  const errors = suite.cases.filter((c) => c.error !== undefined)

  it.runIf(values.length).each(values)('$name', (c) => {
    expect(c.want).toBeTypeOf('number')
    expect(evaluate(node(c), env(c))).toBe(c.want)
  })

  it.runIf(errors.length).each(errors)('$name', (c) => {
    expect(() => evaluate(node(c), env(c))).toThrow(
      expect.objectContaining({ constructor: ExprError, code: c.error }),
    )
  })
})

describe('evaluate', () => {
  it('op que não é string é operador desconhecido', () => {
    expect(() => evaluate({ op: 3, of: [1] }, {})).toThrow(
      expect.objectContaining({ code: 'unknownOp' }),
    )
  })

  it('não confunde nomes do protótipo com operador ou referência', () => {
    expect(() => evaluate({ op: 'constructor', of: [1] }, {})).toThrow(
      expect.objectContaining({ code: 'unknownOp' }),
    )
    expect(() => evaluate({ ref: 'toString' }, {})).toThrow(
      expect.objectContaining({ code: 'missingRef' }),
    )
  })
})
