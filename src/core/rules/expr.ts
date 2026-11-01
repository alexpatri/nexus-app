// Avalia as fórmulas dos catálogos: árvores de {"op", "of"} e {"ref"} com
// números nas folhas. É o porte do sr_eval do systems e do rules/expr do core,
// e as mesmas fixtures rodam nos três.

export type ExprCode = 'malformed' | 'unknownOp' | 'arity' | 'missingRef' | 'divByZero'

export class ExprError extends Error {
  constructor(readonly code: ExprCode) {
    super(`expr: ${code}`)
  }
}

export type Env = Record<string, number>

interface Op {
  min: number
  max: number // 0 é sem limite
  apply: (xs: number[]) => number
}

const ops = new Map<string, Op>([
  ['add', { min: 1, max: 0, apply: (xs) => xs.reduce((a, b) => a + b, 0) }],
  ['mul', { min: 1, max: 0, apply: (xs) => xs.reduce((a, b) => a * b, 1) }],
  ['min', { min: 1, max: 0, apply: (xs) => Math.min(...xs) }],
  ['max', { min: 1, max: 0, apply: (xs) => Math.max(...xs) }],
  ['sub', { min: 2, max: 2, apply: ([a, b]) => a! - b! }],
  ['div', { min: 2, max: 2, apply: ([a, b]) => a! / b! }],
  ['ceil', { min: 1, max: 1, apply: ([a]) => Math.ceil(a!) }],
  ['floor', { min: 1, max: 1, apply: ([a]) => Math.floor(a!) }],
])

function isObject(node: unknown): node is Record<string, unknown> {
  return node !== null && typeof node === 'object' && !Array.isArray(node)
}

// A aridade é conferida antes de avaliar os filhos, da esquerda para a direita,
// para o primeiro erro ser o mesmo nos três avaliadores.
export function evaluate(node: unknown, env: Env): number {
  if (typeof node === 'number') return node
  if (!isObject(node)) throw new ExprError('malformed')

  const keys = Object.keys(node)
  if (keys.length === 1 && keys[0] === 'ref') {
    if (typeof node.ref !== 'string') throw new ExprError('malformed')
    if (!Object.hasOwn(env, node.ref)) throw new ExprError('missingRef')
    return env[node.ref]!
  }

  if (keys.length !== 2 || !('op' in node) || !Array.isArray(node.of)) {
    throw new ExprError('malformed')
  }
  const op = typeof node.op === 'string' ? ops.get(node.op) : undefined
  if (!op) throw new ExprError('unknownOp')
  const args: unknown[] = node.of
  if (args.length < op.min || (op.max > 0 && args.length > op.max)) {
    throw new ExprError('arity')
  }

  const xs = args.map((a) => evaluate(a, env))
  if (node.op === 'div' && xs[1] === 0) throw new ExprError('divByZero')
  return op.apply(xs)
}
