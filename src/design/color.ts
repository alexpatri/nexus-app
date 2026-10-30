export type RGB = [number, number, number]

export function parseHex(hex: string): RGB {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) throw new Error(`cor fora do formato #RRGGBB: ${hex}`)
  const n = parseInt(m[1]!, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function toHex([r, g, b]: RGB): string {
  return (
    '#' +
    [r, g, b]
      .map((c) => Math.round(c).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  )
}

export function mix(a: string, b: string, weightOfB: number): string {
  const x = parseHex(a)
  const y = parseHex(b)
  return toHex([0, 1, 2].map((i) => x[i]! + (y[i]! - x[i]!) * weightOfB) as RGB)
}

// Luminância relativa e razão de contraste da WCAG 2.2.
function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((c) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }) as RGB
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}
