import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import CharacterCard from './CharacterCard.vue'
import { character } from './testing'

describe('CharacterCard', () => {
  it('mostra o rascunho com o passo e a barra de segmentos', () => {
    const w = mount(CharacterCard, {
      props: {
        character: character({
          summary: {
            title: 'Grok',
            subtitle: 'Troll · Samurai urbano',
            progress: { step: 6, total: 9 },
          },
        }),
      },
    })
    expect(w.find('h2').text()).toBe('Grok')
    expect(w.text()).toContain('Rascunho, passo 6 de 9')
    expect(w.findAll('.segments .done')).toHaveLength(5)
    expect(w.findAll('.segments .current')).toHaveLength(1)
    expect(w.findAll('.segments .todo')).toHaveLength(3)
    expect(w.attributes('aria-label')).toBe('Grok, rascunho de Shadowrun no passo 6 de 9')
    expect(w.find('.band').text()).toContain('Shadowrun')
  })

  it('mostra os destaques da ficha pronta e ignora o progresso', () => {
    const w = mount(CharacterCard, {
      props: {
        character: character({
          status: 'ready',
          summary: {
            title: 'Kestrel',
            highlights: [
              { label: 'Essência', value: '6' },
              { label: 'Carma', value: '3' },
            ],
            progress: { step: 9, total: 9 },
          },
        }),
      },
    })
    expect(w.findAll('dt').map((d) => d.text())).toEqual(['Essência', 'Carma'])
    expect(w.find('.draft').exists()).toBe(false)
    expect(w.attributes('aria-label')).toBe('Kestrel, ficha pronta de Shadowrun')
  })

  it('usa o nome do personagem quando o resumo não tem título', () => {
    const w = mount(CharacterCard, { props: { character: character({ name: '' }) } })
    expect(w.find('h2').text()).toBe('Sem nome')
  })

  it('mostra sistema sem módulo no app com a faixa neutra', () => {
    const w = mount(CharacterCard, {
      props: {
        character: character({ system: 'dnd', systemVersion: '5e', summary: { title: 'Mira' } }),
      },
    })
    expect(w.find('.band').text()).toContain('dnd')
    expect(w.find('.band').attributes('style')).toBeUndefined()
  })
})
