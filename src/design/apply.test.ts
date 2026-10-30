import { beforeEach, describe, expect, it } from 'vitest'

import { applyTheme } from './apply'
import { nexusTheme } from './nexus.theme'

describe('applyTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('style')
    document.head.innerHTML = ''
  })

  it('escreve os tokens na raiz do documento', () => {
    applyTheme(nexusTheme, 'nexus')
    const root = document.documentElement
    expect(root.dataset.system).toBe('nexus')
    expect(root.style.colorScheme).toBe('light')
    expect(root.style.getPropertyValue('--color-surface-raised')).toBe('#FFFFFF')
    expect(root.style.getPropertyValue('--color-text-rgb')).toBe('30, 33, 38')
    expect(root.style.getPropertyValue('--radius-control')).toBe('8px')
    expect(root.style.getPropertyValue('--font-numeric')).toContain('Atkinson Hyperlegible Next')
    expect(root.style.getPropertyValue('--ion-background-color-step-500')).toBe('#8A8C8D')
  })

  it('troca a cor da barra de status', () => {
    applyTheme(nexusTheme, 'nexus')
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      '#F6F6F4',
    )
  })
})
