import type { Violation } from '@/core/rules/system'
import type { Mechanics } from './catalogs'
import { type Sheet, violation } from './validate'

export function strictContacts(mech: Mechanics, d: Sheet): Violation[] {
  const r = mech.creation.contacts
  const vs: Violation[] = []
  for (const ct of d.contacts ?? []) {
    const path = `contacts[${ct.key}]`
    const connection = ct.connection ?? 1
    const loyalty = ct.loyalty ?? 1
    const cost = connection + loyalty
    if (cost < r.minKarma || cost > r.maxKarmaPerContact) {
      vs.push(
        violation(path, 'contacts.costOutOfRange', { min: r.minKarma, max: r.maxKarmaPerContact }),
      )
    }
    for (const [field, value, min, max] of [
      ['connection', connection, r.minConnection, r.maxConnection],
      ['loyalty', loyalty, r.minLoyalty, r.maxLoyalty],
    ] as const) {
      if (value < min || value > max) {
        vs.push(violation(`${path}.${field}`, 'contacts.ratingOutOfRange', { field, min, max }))
      }
    }
  }
  return vs
}
