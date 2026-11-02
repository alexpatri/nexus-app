import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'

import PickerSheet from './PickerSheet.vue'

const items = [
  {
    id: 'a',
    name: 'Afinidade Espiritual',
    note: 'Sem nível',
    price: '7',
    blocked: 'Só para despertos',
  },
  { id: 'b', name: 'Ambidestria', note: 'Sem nível', price: '4', description: 'Usa as duas mãos.' },
  { id: 'c', name: 'Coração de Leão', note: 'Sem nível', price: '10' },
]

function open() {
  return mount(PickerSheet, {
    props: { open: true, title: 'Qualidade positiva', items },
    slots: {
      action: ({ item }: { item: { name: string } }) =>
        h('button', { class: 'cta' }, `Adicionar ${item.name}`),
    },
    attachTo: document.body,
  })
}

afterEach(() => {
  document.body.innerHTML = ''
})

const q = (sel: string) => document.body.querySelector(sel)
const all = (sel: string) => [...document.body.querySelectorAll(sel)]

describe('PickerSheet', () => {
  it('põe o foco na busca ao abrir', async () => {
    open()
    await nextTick()
    expect(document.activeElement).toBe(q('input[type="search"]'))
  })

  it('busca sem acento nem maiúscula', async () => {
    open()
    await nextTick()
    const input = q('input[type="search"]') as HTMLInputElement
    input.value = 'coracao'
    input.dispatchEvent(new Event('input'))
    await nextTick()
    expect(all('.name').map((n) => n.textContent)).toEqual(['Coração de Leão'])
  })

  it('mostra o motivo do bloqueio e não abre o item bloqueado', async () => {
    open()
    await nextTick()
    const blocked = all('.item')[0] as HTMLButtonElement
    expect(blocked.disabled).toBe(true)
    expect(blocked.textContent).toContain('Só para despertos')
  })

  it('abre o item livre com a descrição e a ação', async () => {
    open()
    await nextTick()
    ;(all('.item')[1] as HTMLButtonElement).click()
    await nextTick()
    expect(q('.description')?.textContent).toBe('Usa as duas mãos.')
    expect(q('.cta')?.textContent).toBe('Adicionar Ambidestria')
    expect(all('.item')[1]!.getAttribute('aria-expanded')).toBe('true')
  })

  it('fecha pelo botão e pelo Esc', async () => {
    const w = open()
    await nextTick()
    ;(q('[aria-label="Fechar"]') as HTMLButtonElement).click()
    q('input')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(w.emitted('close')).toHaveLength(2)
  })
})
