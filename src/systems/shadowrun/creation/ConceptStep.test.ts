import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import ConceptStep from './ConceptStep.vue'
import type { Edit } from './edit'

function setup(data: Record<string, unknown>) {
  const edit = vi.fn<Edit>((change) => change(data))
  return { w: mount(ConceptStep, { props: { data, edit } }), edit, data }
}

describe('ConceptStep', () => {
  it('grava o conceito digitado pela função de edição', async () => {
    const { w, edit, data } = setup({ identity: { name: 'Grok' } })
    await w.find('input').setValue('Samurai urbano')
    expect(edit).toHaveBeenCalledOnce()
    expect(data.identity).toEqual({ name: 'Grok', concept: 'Samurai urbano' })
  })

  it('uma sugestão preenche o campo e fica marcada', async () => {
    const { w, data } = setup({})
    const decker = w.findAll('button').find((b) => b.text() === 'Decker')!
    await decker.trigger('click')
    expect(data.identity).toEqual({ concept: 'Decker' })
    await w.setProps({ data: { ...data } })
    expect(
      w
        .findAll('button')
        .find((b) => b.text() === 'Decker')!
        .attributes('aria-pressed'),
    ).toBe('true')
  })

  it('apagar o conceito tira o campo, em vez de gravar vazio', async () => {
    const { w, data } = setup({ identity: { concept: 'Face' } })
    await w.find('input').setValue('')
    expect(data.identity).toEqual({})
  })
})
