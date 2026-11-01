type Buy = { points?: number; karma?: number }

// Muda os pontos de um atributo; zero some do data, como pede o contrato
// ("ausente é zero").
export function setPoints(data: Record<string, unknown>, attr: string, points: number) {
  const attributes = { ...(data.attributes as Record<string, Buy> | undefined) }
  const buy: Buy = { ...attributes[attr] }
  if (points > 0) buy.points = points
  else delete buy.points
  if (Object.keys(buy).length > 0) attributes[attr] = buy
  else delete attributes[attr]
  if (Object.keys(attributes).length > 0) data.attributes = attributes
  else delete data.attributes
}

export function pointsOf(data: Record<string, unknown>, attr: string): number {
  return (data.attributes as Record<string, Buy> | undefined)?.[attr]?.points ?? 0
}
