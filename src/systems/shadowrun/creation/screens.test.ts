import { mount } from '@vue/test-utils'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { computed, defineComponent, h, reactive } from 'vue'

import { readFixture, shadowrunCatalogs } from '../../../../test/shadowrun'
import { createShadowrun, type Derived } from '../rules'
import AttributesScreen from './AttributesScreen.vue'
import { buildUiCatalogs, uiCatalogs } from './catalogs'
import type { Edit } from './edit'
import { provideFooter } from './footer'
import MagicScreen from './MagicScreen.vue'
import MetatypeScreen from './MetatypeScreen.vue'
import PrioritiesScreen from './PrioritiesScreen.vue'
import QualitiesScreen from './QualitiesScreen.vue'
import SkillsScreen from './SkillsScreen.vue'

const catalogs = shadowrunCatalogs()
const rules = createShadowrun(catalogs)

beforeAll(() => {
  uiCatalogs.value = buildUiCatalogs(catalogs)
})

afterEach(() => {
  document.body.innerHTML = ''
})

// O Seletor vai para o body (Teleport), fora da árvore do wrapper.
const inBody = (sel: string) => [...document.body.querySelectorAll<HTMLElement>(sel)]
const button = (text: string) =>
  inBody('button').find(
    (b) => b.getAttribute('aria-label') === text || b.textContent?.trim().startsWith(text),
  )!

// Monta a tela como o CreationFlow: data reativo, edit que aplica a mudança e
// o rodapé exposto para conferir.
function setup(screen: object, initial: Record<string, unknown>, step?: string) {
  const state = reactive({ data: initial })
  const edit: Edit = (change) => change(state.data)
  let footer!: ReturnType<typeof provideFooter>
  const Host = defineComponent(() => {
    footer = provideFooter()
    const derived = computed(() => rules.derive(state.data) as Derived)
    const violations = computed(() =>
      rules.validate(state.data, 'strict').filter((v) => !step || v.step === step),
    )
    return () =>
      h(screen, { data: state.data, edit, derived: derived.value, violations: violations.value })
  })
  const w = mount(Host, { attachTo: document.body })
  return {
    w,
    data: () => state.data,
    status: () => footer.value.status?.value,
    alert: () => footer.value.alert?.value,
    blocked: () => footer.value.blocked?.value,
  }
}

const GROK = { metatype: 'B', attributes: 'A', magic: 'E', skills: 'C', resources: 'D' }

describe('PrioritiesScreen', () => {
  it('escolhe, troca e mostra o que a letra dá', async () => {
    const s = setup(PrioritiesScreen, { priorities: { metatype: 'B' } })
    const letter = (col: string, l: string) =>
      s.w
        .find(`[aria-labelledby="priority-${col}"]`)
        .findAll('button')
        .find((b) => b.text() === l)!

    expect(s.blocked()).toBe(true)
    expect(s.status()).toBe('Falta Atributos, Magia ou Ressonância, Perícias e Recursos.')

    await letter('attributes', 'B').trigger('click')
    expect(s.data().priorities).toEqual({ attributes: 'B' })
    expect(letter('attributes', 'B').attributes('aria-checked')).toBe('true')

    await letter('metatype', 'A').trigger('click')
    await letter('metatype', 'B').trigger('click')
    expect(s.data().priorities).toEqual({ metatype: 'B', attributes: 'A' })
    await letter('attributes', 'B').trigger('click')
    expect(s.data().priorities).toEqual({ metatype: 'A', attributes: 'B' })
    expect(letter('metatype', 'B').attributes('aria-label')).toBe(
      'B, usada em Atributos; tocar troca',
    )
    expect(s.w.text()).toContain('20 pontos de atributo.')
  })

  it('libera o avanço com as cinco colunas', () => {
    const s = setup(PrioritiesScreen, { priorities: GROK })
    expect(s.blocked()).toBe(false)
    expect(s.status()).toBe('Todas as colunas têm prioridade.')
  })
})

describe('MetatypeScreen', () => {
  it('lista só os metatipos da letra e abre as faixas do escolhido', async () => {
    const s = setup(MetatypeScreen, { priorities: { ...GROK, metatype: 'C' } })
    const names = s.w.findAll('[role="radio"] .name').map((n) => n.text())
    expect(names).toEqual(['Humano', 'Elfo', 'Anão', 'Ork'])
    expect(s.blocked()).toBe(true)

    await s.w.findAll('[role="radio"]')[1]!.trigger('click')
    expect(s.data().metatype).toBe('elf')
    expect(s.status()).toBe('Elfo com 3 pontos especiais.')
    expect(s.w.find('.ranges').text()).toContain('CAR')
  })

  it('avisa quando o metatipo não está mais na letra', () => {
    const s = setup(MetatypeScreen, { priorities: { ...GROK, metatype: 'C' }, metatype: 'troll' })
    expect(s.alert()).toBe(
      'Troll não está na prioridade C. Escolha outro metatipo ou mude a letra.',
    )
    expect(s.blocked()).toBe(true)
  })
})

describe('AttributesScreen', () => {
  const grok = () => ({
    priorities: { ...GROK },
    metatype: 'troll',
    attributes: { bod: { points: 4 }, agi: { points: 3 } },
  })

  it('soma os pontos ao mínimo do metatipo e conta o orçamento', async () => {
    const s = setup(AttributesScreen, grok())
    expect(s.w.find('[aria-label="Corpo 9"]').exists()).toBe(true)
    expect(s.status()).toBe('Sobram 17 pontos. Você pode voltar depois.')

    await s.w.find('[aria-label="Subir Força"]').trigger('click')
    expect(s.data().attributes).toMatchObject({ str: { points: 1 } })
    expect(s.status()).toBe('Sobram 16 pontos. Você pode voltar depois.')
  })

  it('trava o + no máximo natural e acusa dois no máximo', async () => {
    const s = setup(AttributesScreen, {
      ...grok(),
      attributes: { bod: { points: 5 }, agi: { points: 4 } },
    })
    expect(s.w.find('[aria-label="Subir Corpo"]').attributes('disabled')).toBeDefined()
    expect(s.alert()).toBe(
      'Só um atributo pode começar no máximo natural: Corpo e Agilidade estão no máximo.',
    )
    expect(s.w.find('[aria-label="Corpo 10"]').classes()).toContain('flagged')
  })

  it('troll na B não tem pontos especiais: Trunfo só com carma', () => {
    const s = setup(AttributesScreen, grok())
    expect(s.w.find('[aria-label="Baixar Trunfo"]').exists()).toBe(false)
    expect(s.w.text()).toContain('Sem pontos especiais; sobe com carma no passo 7')
  })
})

describe('QualitiesScreen', () => {
  const troll = () => ({
    identity: { name: 'Grok' },
    priorities: { ...GROK },
    metatype: 'troll',
    qualities: [
      { key: 'q1', id: 'quick-healer' },
      { key: 'q2', id: 'bad-rep' },
    ] as unknown[],
  })

  it('separa positivas e negativas e mostra o carma', () => {
    const s = setup(QualitiesScreen, troll(), 'qualities')
    const sides = s.w.findAll('.side')
    expect(sides[0]!.text()).toContain('Curandeiro Rápido')
    expect(sides[1]!.text()).toContain('Má Reputação')
    expect(s.status()).toBe('Carma: 3 gastos de 32')
    expect(s.w.text()).toContain('O personagem tem 32 de carma: 25 iniciais e 7 das negativas.')
  })

  it('adiciona pelo seletor e abre a linha nova', async () => {
    const s = setup(QualitiesScreen, troll(), 'qualities')
    button('Adicionar positiva').click()
    await s.w.vm.$nextTick()
    inBody('.item')
      .find((b) => b.textContent?.includes('Ambidestria'))!
      .click()
    await s.w.vm.$nextTick()
    button('Adicionar por 4 de carma').click()
    await s.w.vm.$nextTick()

    const added = (s.data().qualities as { id: string; key: string }[]).at(-1)!
    expect(added.id).toBe('ambidextrous')
    expect(added.key).toMatch(/^[0-9a-f]{8}$/)
    expect(inBody('[role="dialog"]')).toHaveLength(0)
    expect(s.w.find('[aria-expanded="true"]').text()).toContain('Ambidestria')
  })

  it('bloqueia no seletor o que não cabe, com o motivo', async () => {
    const s = setup(
      QualitiesScreen,
      { ...troll(), qualities: [{ key: 'q1', id: 'lucky' }] },
      'qualities',
    )
    button('Adicionar positiva').click()
    await s.w.vm.$nextTick()
    const note = (name: string) =>
      inBody('.item')
        .find((b) => b.querySelector('.name')?.textContent === name)!
        .querySelector('.note')!.textContent
    expect(note('Sortudo')).toBe('Já está na ficha')
    expect(note('Afinidade Espiritual')).toBe('Só para despertos')
    expect(note('Aparência Humana')).toBe('Sem nível')
    button('Fechar').click()
    await s.w.vm.$nextTick()
    button('Adicionar negativa').click()
    await s.w.vm.$nextTick()
    expect(note('Elfo Poser')).toBe('Só para humano')
  })

  it('pede a opção que falta e grava a escolhida', async () => {
    const s = setup(
      QualitiesScreen,
      { ...troll(), qualities: [{ key: 'q1', id: 'addiction' }] },
      'qualities',
    )
    expect(s.w.find('.problem').text()).toBe('Vício: escolha uma opção.')
    await s.w.find('.row').trigger('click')
    const moderate = s.w
      .findAll('input[type="radio"]')
      .find((r) => r.element.parentElement?.textContent?.includes('Moderado'))!
    await moderate.setValue(true)
    expect(s.data().qualities).toEqual([{ key: 'q1', id: 'addiction', option: 'moderate' }])
    expect(s.w.find('.problem').exists()).toBe(false)
    expect(s.w.find('.karma').text()).toContain('9')
  })

  it('sobe o nível até o máximo e remove', async () => {
    const s = setup(
      QualitiesScreen,
      { ...troll(), qualities: [{ key: 'q1', id: 'will-to-live', rating: 2 }] },
      'qualities',
    )
    await s.w.find('.row').trigger('click')
    await s.w.find('[aria-label="Subir o nível de Desejo de Viver"]').trigger('click')
    expect(s.data().qualities).toEqual([{ key: 'q1', id: 'will-to-live', rating: 3 }])
    expect(
      s.w.find('[aria-label="Subir o nível de Desejo de Viver"]').attributes('disabled'),
    ).toBeDefined()
    await s.w.find('.remove').trigger('click')
    expect(s.data()).not.toHaveProperty('qualities')
  })
})

describe('SkillsScreen', () => {
  const beto = () =>
    readFixture('fixtures/shadowrun/5e/beto-skills.json') as { data: Record<string, unknown> }
  const tab = (s: ReturnType<typeof setup>, name: string) =>
    s.w.findAll('[role="tab"]').find((t) => t.text().startsWith(name))!

  it('mostra o orçamento de cada aba e o nível com a parada', async () => {
    const s = setup(SkillsScreen, beto().data, 'skills')
    expect(tab(s, 'Ativas').text()).toContain('28 de 28')
    expect(tab(s, 'Grupos').text()).toContain('2 de 2')
    expect(tab(s, 'Conhecimento').text()).toContain('12 de 12')
    const automatics = s.w.findAll('.row').find((r) => r.text().includes('Automáticas'))!
    expect(automatics.find('.rating').text()).toBe('5')
    expect(automatics.find('.pool').text()).toContain('9')
    expect(s.status()).toBe('Todos os pontos distribuídos.')

    await tab(s, 'Grupos').trigger('click')
    expect(s.w.find('.row').text()).toContain('Paradas: Corrida 13, Ginástica 6, Natação 13')

    await tab(s, 'Idiomas').trigger('click')
    const rows = s.w.findAll('.row')
    expect(rows[0]!.find('.rating').text()).toBe('N')
    expect(rows[1]!.find('.pool').text()).toContain('4')
  })

  it('bloqueia no seletor e adiciona a perícia com nível 1', async () => {
    const s = setup(SkillsScreen, beto().data, 'skills')
    button('Adicionar perícia').click()
    await s.w.vm.$nextTick()
    const note = (name: string) =>
      inBody('.item')
        .find((b) => b.querySelector('.name')?.textContent === name)!
        .querySelector('.note')!.textContent
    expect(note('Corrida')).toBe('Grupo Atletismo já comprado')
    expect(note('Conjuração')).toBe('Só para despertos')
    expect(note('Automáticas')).toBe('Já está na ficha')
    inBody('.item')
      .find((b) => b.querySelector('.name')?.textContent === 'Etiqueta')!
      .click()
    await s.w.vm.$nextTick()
    button('Adicionar com nível 1').click()
    await s.w.vm.$nextTick()
    expect((s.data().skills as { active: Record<string, unknown> }).active.etiquette).toEqual({
      points: 1,
    })
  })

  it('trava no 6, ou no 7 com Aptidão na perícia', async () => {
    const data = {
      identity: { name: 'Ana' },
      priorities: { metatype: 'D', attributes: 'B', magic: 'E', skills: 'A', resources: 'C' },
      metatype: 'human',
      qualities: [{ key: 'q1', id: 'aptitude', choice: 'pistols' }],
      skills: {
        active: { automatics: { points: 6 }, pistols: { points: 6 } },
        languages: [{ key: 'l1', name: 'Inglês', native: true }],
      },
    }
    const s = setup(SkillsScreen, data, 'skills')
    const open = async (name: string) =>
      s.w
        .findAll('.row')
        .find((r) => r.text().includes(name))!
        .trigger('click')
    await open('Automáticas')
    expect(s.w.find('[aria-label="Subir Automáticas"]').attributes('disabled')).toBeDefined()
    await open('Pistolas')
    expect(s.w.find('[aria-label="Subir Pistolas"]').attributes('disabled')).toBeUndefined()
  })

  it('adiciona conhecimento pelo formulário e avisa a falta do idioma nativo', async () => {
    const s = setup(SkillsScreen, { identity: { name: 'Ana' }, metatype: 'human' }, 'skills')
    expect(s.alert()).toBe('Falta o idioma nativo.')
    await tab(s, 'Conhecimento').trigger('click')
    button('Adicionar conhecimento').click()
    await s.w.vm.$nextTick()
    await s.w.find('.add-form input[type="text"]').setValue('Gangues de Seattle')
    await s.w.find('.add-form').trigger('submit')
    const k = (s.data().skills as { knowledge: Record<string, unknown>[] }).knowledge
    expect(k).toHaveLength(1)
    expect(k[0]).toMatchObject({ name: 'Gangues de Seattle', category: 'street', points: 1 })
  })
})

describe('MagicScreen', () => {
  const ana = (magic: Record<string, unknown>, letter = 'A') => ({
    identity: { name: 'Ana' },
    priorities: { metatype: 'D', attributes: 'B', magic: letter, skills: 'C', resources: 'E' },
    metatype: 'human',
    magic,
    skills: { languages: [{ key: 'l1', name: 'Inglês', native: true }] },
  })

  it('lista o que a letra dá e troca de despertar sem levar o que não vale', async () => {
    const s = setup(
      MagicScreen,
      ana({ awakening: 'magician', tradition: 'hermetic' }, 'B'),
      'magic',
    )
    const options = s.w.findAll('[role="radio"]').filter((o) => o.find('.detail').exists())
    expect(options.map((o) => o.find('.name').text())).toEqual([
      'Mago',
      'Adepto Místico',
      'Tecnomante',
      'Adepto',
      'Mago Aspectado',
      'Mundano',
    ])
    expect(options[3]!.text()).toContain(
      'Magia 6, uma perícia ativa no nível 4 e 6 pontos de poder.',
    )

    await options[3]!.trigger('click')
    expect(s.data().magic).toEqual({ awakening: 'adept' })
    await options[5]!.trigger('click')
    expect(s.data()).not.toHaveProperty('magic')
  })

  it('escolhe a perícia dada só entre as de Magia', async () => {
    const s = setup(MagicScreen, ana({ awakening: 'magician', tradition: 'hermetic' }), 'magic')
    expect(s.w.text()).toContain('0 de 2, no nível 5')
    button('Escolher perícia').click()
    await s.w.vm.$nextTick()
    const names = inBody('.item .name').map((n) => n.textContent)
    expect(names).toContain('Conjuração')
    expect(names).not.toContain('Pistolas')
    inBody('.item')
      .find((b) => b.querySelector('.name')?.textContent === 'Conjuração')!
      .click()
    await s.w.vm.$nextTick()
    inBody('[role="dialog"] button')
      .find((b) => b.textContent?.trim() === 'Adicionar')!
      .click()
    await s.w.vm.$nextTick()
    expect((s.data().magic as { freeSkills: string[] }).freeSkills).toEqual(['spellcasting'])
  })

  it('mostra os poderes da Clara em quartos e o estouro do livro', () => {
    const clara = readFixture('fixtures/shadowrun/5e/clara-magic.json') as {
      data: Record<string, unknown>
    }
    const s = setup(MagicScreen, clara.data, 'magic')
    expect(s.w.findAll('.group')).toHaveLength(3)
    expect(s.w.findAll('.cost').map((x) => x.text())).toEqual(['0,25', '0,5', '0,5', '0,5', '0,5'])
    expect(s.alert()).toBe('Os poderes passam dos pontos de poder em 0,25.')
  })

  it('compra pontos de poder do adepto místico até a Magia', async () => {
    const s = setup(
      MagicScreen,
      ana({ awakening: 'mystic-adept', tradition: 'shamanic' }, 'C'),
      'magic',
    )
    await s.w.find('[aria-label="Comprar mais um ponto de poder"]').trigger('click')
    expect((s.data().magic as { powerPointsKarma: number }).powerPointsKarma).toBe(1)
    await s.w.find('[aria-label="Comprar mais um ponto de poder"]').trigger('click')
    await s.w.find('[aria-label="Comprar mais um ponto de poder"]').trigger('click')
    expect(
      s.w.find('[aria-label="Comprar mais um ponto de poder"]').attributes('disabled'),
    ).toBeDefined()
  })
})
