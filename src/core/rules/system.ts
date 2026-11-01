// Contrato de uma estratégia de regras no app, o mesmo do rules.System do core:
// os dois lados rodam as mesmas fixtures e emitem os mesmos códigos.

export type Mode = 'lenient' | 'strict'

export interface Violation {
  step: string
  path: string
  code: string
  params?: Record<string, unknown>
}

export interface Summary {
  title: string
  subtitle: string
  highlights?: { label: string; value: string }[]
  progress?: { step: number; total: number }
}

export interface RulesSystem {
  key: { system: string; version: string }
  validate(data: unknown, mode: Mode): Violation[]
  derive(data: unknown): unknown
  summarize(data: unknown): Summary
}
