// A única forma de as telas mudarem a ficha: a mudança passa pelo Lenient
// antes do salvamento automático.
export type Edit = (change: (data: Record<string, unknown>) => void) => void

// Cópia funda de um trecho do data, que é reativo: structuredClone não aceita proxy.
export const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T
