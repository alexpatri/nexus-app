// As telas da criação, cada uma dentro de um dos nove passos de
// system.json#creation.steps. O passo 2 tem três telas.
export interface Screen {
  id: string
  step: string
  title: string
  // Rótulo do botão que leva a esta tela: "Escolher metatipo".
  action: string
}

export const stepIds = [
  'concept',
  'metatype',
  'magic',
  'qualities',
  'skills',
  'resources',
  'karma',
  'final-calculations',
  'finishing',
]

export const screens: Screen[] = [
  { id: 'concept', step: 'concept', title: 'Conceito', action: 'Escrever o conceito' },
  { id: 'priorities', step: 'metatype', title: 'Prioridades', action: 'Escolher prioridades' },
  { id: 'metatype', step: 'metatype', title: 'Metatipo', action: 'Escolher metatipo' },
  { id: 'attributes', step: 'metatype', title: 'Atributos', action: 'Distribuir atributos' },
  { id: 'magic', step: 'magic', title: 'Magia ou Ressonância', action: 'Escolher magia' },
  { id: 'qualities', step: 'qualities', title: 'Qualidades', action: 'Comprar qualidades' },
  { id: 'skills', step: 'skills', title: 'Perícias', action: 'Comprar perícias' },
  { id: 'resources', step: 'resources', title: 'Recursos', action: 'Gastar recursos' },
  { id: 'karma', step: 'karma', title: 'Carma e contatos', action: 'Gastar o carma' },
  {
    id: 'final-calculations',
    step: 'final-calculations',
    title: 'Cálculos finais',
    action: 'Fazer os cálculos finais',
  },
  { id: 'finishing', step: 'finishing', title: 'Toques finais', action: 'Dar os toques finais' },
]

// Tela pela rota; sem tela, a primeira do passo que ainda falta (o do cartão).
export function screenIndex(id: string | undefined, progressStep: number | undefined): number {
  const byId = screens.findIndex((s) => s.id === id)
  if (byId >= 0) return byId
  const step = stepIds[(progressStep ?? 1) - 1]
  return Math.max(
    0,
    screens.findIndex((s) => s.step === step),
  )
}

export function stepNumber(screen: Screen): number {
  return stepIds.indexOf(screen.step) + 1
}
