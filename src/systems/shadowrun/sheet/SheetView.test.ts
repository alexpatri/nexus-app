import { mount } from '@vue/test-utils'
import { beforeAll, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import type { OpenSheet } from '@/core/sheets/open'
import { readFixture, shadowrunCatalogs } from '../../../../test/shadowrun'
import { buildUiCatalogs, uiCatalogs } from '../creation/catalogs'
import { createShadowrun } from '../rules'
import SheetView from './SheetView.vue'

const catalogs = shadowrunCatalogs()
const rules = createShadowrun(catalogs)

beforeAll(() => {
  uiCatalogs.value = buildUiCatalogs(catalogs)
})

function view(name: string) {
  const data = (
    readFixture(`fixtures/shadowrun/5e/${name}.json`) as { data: Record<string, unknown> }
  ).data
  const open = { data, sheet: { id: 's1', status: 'ready' } } as unknown as OpenSheet
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:p(.*)*', component: { render: () => null } }],
  })
  return mount(SheetView, { props: { open, rules }, global: { plugins: [router] } })
}

describe('SheetView', () => {
  it('mostra o cartão, os atributos e os limites da Clara', () => {
    const w = view('clara-final')
    expect(w.find('.sin .what').text()).toBe('Elfo · Adepta mística desSINada')
    expect(w.find('.stats').text()).toContain('10')
    expect(w.find('.edit').attributes('href')).toBe('/fichas/s1/concept')
  })

  it('troca de aba e mostra os espíritos na de Magia', async () => {
    const w = view('clara-final')
    const tab = w.findAll('[role="tab"]')
    expect(tab.map((t) => t.text())).toEqual([
      'Resumo',
      'Perícias',
      'Equipamento',
      'Contatos',
      'Magia',
    ])
    await tab[4]!.trigger('click')
    expect(w.text()).toContain('Água, 4 serviços')
    await tab[3]!.trigger('click')
    expect(w.text()).toContain('Tenente dos Ancestrais')
  })

  it('não tem aba de magia para mundano', () => {
    const w = view('beto-final')
    expect(w.findAll('[role="tab"]').map((t) => t.text())).not.toContain('Magia')
  })
})
