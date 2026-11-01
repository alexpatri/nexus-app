// A única forma de as telas mudarem a ficha: a mudança passa pelo Lenient
// antes do salvamento automático.
export type Edit = (change: (data: Record<string, unknown>) => void) => void
