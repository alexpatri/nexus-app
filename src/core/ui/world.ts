// A passagem entre o Nexus e o mundo de um sistema (frontend-design-nexus.md):
// a tela atual esmaece para um carregamento neutro, com uma roda na cor do
// sistema, e o carregamento esmaece para a tela seguinte. Igual na entrada e na
// saída. É o único movimento orquestrado do app.

import { nexusTheme } from '@/design/nexus.theme'

const FADE_MS = 280
// O carregamento fica ao menos isso na tela, para não piscar com tudo em cache.
const MIN_MS = 500

export interface Splash {
  // Cor principal do sistema, a da roda.
  color: string
}

function reducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let overlay: HTMLElement | undefined
let shownAt = 0
// A cor do sistema aberto, para a saída usar a mesma roda.
let current: Splash | undefined

function el(style: Partial<CSSStyleDeclaration>) {
  const e = document.createElement('div')
  Object.assign(e.style, style)
  return e
}

async function show(splash: Splash) {
  overlay?.remove()
  const root = el({
    position: 'fixed',
    inset: '0',
    zIndex: 'var(--z-world)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: nexusTheme.color.surface,
    opacity: '0',
  })
  root.setAttribute('role', 'status')
  root.setAttribute('aria-label', 'Carregando')
  const wheel = el({
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: `3px solid color-mix(in srgb, ${splash.color} 18%, transparent)`,
    borderTopColor: splash.color,
  })
  root.append(wheel)
  document.body.append(root)
  overlay = root
  if (!reducedMotion()) {
    wheel.animate([{ transform: 'rotate(0turn)' }, { transform: 'rotate(1turn)' }], {
      duration: 800,
      iterations: Infinity,
    })
  }
  const fade = root.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: FADE_MS,
    easing: 'ease-out',
    fill: 'forwards',
  })
  await fade.finished
  shownAt = performance.now()
}

async function hide() {
  const root = overlay
  if (!root) return
  overlay = undefined
  await wait(Math.max(0, MIN_MS - (performance.now() - shownAt)))
  const fade = root.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: FADE_MS,
    easing: 'ease-in-out',
    fill: 'forwards',
  })
  await fade.finished
  root.remove()
}

// Entrada: a tela atual esmaece para o carregamento; quem chama navega depois.
export async function enterWorld(splash: Splash): Promise<void> {
  current = splash
  await show(splash)
}

// Chamado pela tela do sistema quando ela já está desenhada por baixo.
export function arriveInWorld(): Promise<void> {
  return hide()
}

// Saída: a ficha esmaece para o carregamento antes da troca de página.
export async function leaveWorld(): Promise<void> {
  if (current) await show(current)
}

// Chamado pela página do Nexus quando ela já está desenhada por baixo.
export function returnFromWorld(): Promise<void> {
  return hide()
}
