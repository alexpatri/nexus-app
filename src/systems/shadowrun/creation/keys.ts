// key de item de lista: 8 caracteres, única na ficha inteira (contrato, seção 2).
export function newKey(data: Record<string, unknown>): string {
  const used = new Set<string>()
  const collect = (v: unknown) => {
    if (Array.isArray(v)) {
      for (const x of v) {
        if (x && typeof x === 'object' && 'key' in x) used.add(String(x.key))
        collect(x)
      }
    } else if (v && typeof v === 'object') {
      for (const x of Object.values(v)) collect(x)
    }
  }
  collect(data)
  for (;;) {
    const key = crypto.randomUUID().replaceAll('-', '').slice(0, 8)
    if (!used.has(key)) return key
  }
}
