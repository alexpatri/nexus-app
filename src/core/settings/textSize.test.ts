import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('textSize', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.style.fontSize = ''
    vi.resetModules()
  })

  it('aplica a escala em porcentagem e lembra a escolha', async () => {
    const { setTextSize } = await import('./textSize')
    setTextSize('larger')
    expect(document.documentElement.style.fontSize).toBe('130%')

    vi.resetModules()
    const reopened = await import('./textSize')
    expect(reopened.textSize.value).toBe('larger')
  })

  it('o padrão não força tamanho, para respeitar o do navegador', async () => {
    const { setTextSize } = await import('./textSize')
    setTextSize('large')
    setTextSize('default')
    expect(document.documentElement.style.fontSize).toBe('')
  })

  it('ignora valor desconhecido guardado', async () => {
    localStorage.setItem('nexus.textSize', 'gigante')
    const { textSize } = await import('./textSize')
    expect(textSize.value).toBe('default')
  })
})
