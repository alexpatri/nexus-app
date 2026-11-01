// Os nove passos de system.json#creation.steps, com o texto curto das telas.
export interface Step {
  id: string
  title: string
  // Rótulo do botão que leva a este passo: "Escolher prioridades".
  action: string
}

export const steps: Step[] = [
  { id: 'concept', title: 'Conceito', action: 'Escrever o conceito' },
  { id: 'metatype', title: 'Prioridades', action: 'Escolher prioridades' },
  { id: 'magic', title: 'Magia ou Ressonância', action: 'Escolher magia' },
  { id: 'qualities', title: 'Qualidades', action: 'Comprar qualidades' },
  { id: 'skills', title: 'Perícias', action: 'Comprar perícias' },
  { id: 'resources', title: 'Recursos', action: 'Gastar recursos' },
  { id: 'karma', title: 'Carma e contatos', action: 'Gastar o carma' },
  { id: 'final-calculations', title: 'Cálculos finais', action: 'Fazer os cálculos finais' },
  { id: 'finishing', title: 'Toques finais', action: 'Dar os toques finais' },
]

export function stepIndex(id: string | undefined): number {
  const i = steps.findIndex((s) => s.id === id)
  return i < 0 ? 0 : i
}
