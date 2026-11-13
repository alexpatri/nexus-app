import { type ComputedRef, inject, type InjectionKey, provide } from 'vue'

import type { Derived } from '../rules'
import { clone } from './edit'

// No rascunho, o + para onde o orçamento acaba. Ainda dá para ficar acima dele
// trocando a prioridade, e aí o rodapé pede para tirar o excesso. Na ficha pronta
// nada trava: a regra da casa manda.
export interface Guard {
  draft: ComputedRef<boolean>
  derive: (data: Record<string, unknown>) => Derived | undefined
}

const key: InjectionKey<Guard> = Symbol('guard')

export function provideGuard(g: Guard) {
  provide(key, g)
}

export type Change = (data: Record<string, unknown>) => void

// fits(change, ...budgets): a mudança não leva nenhum desses orçamentos para
// cima do total. Um orçamento que já estava acima só pode descer.
export function useGuard(data: () => Record<string, unknown>, derived: () => Derived | undefined) {
  const g = inject(key, undefined)
  return (change: Change, ...budgets: string[]): boolean => {
    if (!g?.draft.value) return true
    const next = clone(data())
    change(next)
    const after = g.derive(next)?.budgets
    const before = derived()?.budgets
    return budgets.every((id) => {
      const a = after?.[id]
      if (!a || a.spent <= a.total) return true
      const b = before?.[id]
      return b !== undefined && a.spent <= b.spent
    })
  }
}
