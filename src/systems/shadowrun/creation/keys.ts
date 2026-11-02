// key de item de lista: 8 caracteres, única na ficha inteira (contrato, seção 2).
export function newKey(data: Record<string, unknown>): string {
  const used = new Set<string>()
  const collect = (list: unknown) => {
    for (const x of Array.isArray(list) ? list : []) {
      if (x && typeof x === 'object' && 'key' in x) used.add(String(x.key))
    }
  }
  collect(data.qualities)
  const skills = data.skills as { knowledge?: unknown; languages?: unknown } | undefined
  collect(skills?.knowledge)
  collect(skills?.languages)
  for (;;) {
    const key = crypto.randomUUID().replaceAll('-', '').slice(0, 8)
    if (!used.has(key)) return key
  }
}
