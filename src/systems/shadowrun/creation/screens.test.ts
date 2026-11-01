import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { computed, defineComponent, h, reactive } from 'vue'

import type { Catalogs } from '../rules/catalogs'
import { createShadowrun, type Derived } from '../rules'
import AttributesScreen from './AttributesScreen.vue'
import { uiCatalogs } from './catalogs'
import type { Edit } from './edit'
import { provideFooter } from './footer'
import MetatypeScreen from './MetatypeScreen.vue'
import PrioritiesScreen from './PrioritiesScreen.vue'

const dir = join(process.cwd(), 'test/fixtures/data/systems/shadowrun/5e')
const read = (name: string) => JSON.parse(readFileSync(join(dir, `${name}.json`), 'utf8'))
const catalogs = {
  system: read('system'),
  metatypes: read('metatypes'),
  priorities: read('priorities'),
  mechanics: read('mechanics'),
} as Catalogs
const rules = createShadowrun(catalogs)

beforeAll(() => {
  uiCatalogs.value = {
    columns: catalogs.priorities.columns,
    rows: catalogs.priorities.rows,
    metatypes: catalogs.metatypes.metatypes,
    attributes: read('attributes').attributes,
    awakenings: read('awakening').awakenings,
  }
})

// Monta a tela como o CreationFlow: data reativo, edit que aplica a mudança e
// o rodapé exposto para conferir.
function setup(screen: object, initial: Record<string, unknown>) {
  const state = reactive({ data: initial })
  const edit: Edit = (change) => change(state.data)
  let footer!: ReturnType<typeof provideFooter>
  const Host = defineComponent(() => {
    footer = provideFooter()
    const derived = computed(() => rules.derive(state.data) as Derived)
    const violations = computed(() => rules.validate(state.data, 'strict'))
    return () =>
      h(screen, { data: state.data, edit, derived: derived.value, violations: violations.value })
  })
  const w = mount(Host)
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
