// A passagem entre o Nexus e o mundo de um sistema (frontend-design-nexus.md).
// Na entrada, o cartão cresce em neutro até cobrir a tela e a cor do sistema
// varre da direita para a esquerda; a tela do sistema aparece quando ela está
// pronta por baixo. Na saída, o contrário: a cor cobre a tela e o neutro varre
// da esquerda para a direita, devolvendo o Nexus. É o único movimento
// orquestrado do app.

const GROW_MS = 360
const SWEEP_MS = 480
const FADE_MS = 220
const EASE = 'cubic-bezier(0.65, 0, 0.35, 1)'

// O que a passagem usa da marca do sistema.
export interface Splash {
  art: string
  // Cor sólida da marca, para a borda pixelada da frente da cor.
  edge: string
}

function reducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let overlay: HTMLElement | undefined
let swept: Promise<unknown> = Promise.resolve()
// A marca do último sistema aberto, para a saída começar na cor dele.
let last: Splash | undefined

function el(style: Partial<CSSStyleDeclaration>) {
  const e = document.createElement('div')
  Object.assign(e.style, style)
  return e
}

function cover(background: string) {
  const root = el({
    position: 'fixed',
    inset: '0',
    zIndex: 'var(--z-world)',
    background,
    pointerEvents: 'none',
    overflow: 'hidden',
  })
  root.setAttribute('aria-hidden', 'true')
  return root
}

// Camada que varre a tela, com a borda pixelada (como a do cabeçalho do livro)
// na frente. from é o lado de onde ela entra.
function sweeper(background: string, edge: string, from: 'left' | 'right') {
  const layer = el({
    position: 'absolute',
    inset: '0',
    background,
    clipPath: from === 'right' ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)',
  })
  const pixels = el({
    position: 'absolute',
    top: '0',
    bottom: '0',
    width: '10px',
    left: from === 'right' ? '100%' : '0%',
    transform: from === 'right' ? 'translateX(-100%)' : 'none',
    background: `linear-gradient(180deg, ${edge} 0 8px, transparent 8px 14px, ${edge} 14px 18px, transparent 18px 30px, ${edge} 30px 36px, transparent 36px 46px) left top / 5px 46px repeat-y, linear-gradient(180deg, transparent 0 4px, ${edge} 4px 10px, transparent 10px 24px, ${edge} 24px 28px, transparent 28px 40px) right top / 5px 40px repeat-y`,
  })
  return { layer, pixels }
}

async function sweep(layer: HTMLElement, pixels: HTMLElement, from: 'left' | 'right') {
  layer.getBoundingClientRect()
  layer.style.transition = `clip-path ${SWEEP_MS}ms ${EASE}`
  pixels.style.transition = `left ${SWEEP_MS}ms ${EASE}, opacity 120ms ease-out ${SWEEP_MS - 120}ms`
  layer.style.clipPath = 'inset(0 0 0 0)'
  pixels.style.left = from === 'right' ? '0%' : '100%'
  pixels.style.opacity = '0'
  await wait(SWEEP_MS)
}

function clipOf(r: DOMRect) {
  const { innerWidth: w, innerHeight: h } = window
  return `inset(${r.top}px ${w - r.right}px ${h - r.bottom}px ${r.left}px round var(--nx-radius-card))`
}

// Entrada: termina com a tela coberta pela cor do sistema; quem chama navega e,
// quando a tela do sistema estiver pronta, chama arriveInWorld.
export async function enterWorld(from: DOMRect, splash: Splash): Promise<void> {
  leaveOverlay()
  last = splash
  const root = cover('var(--color-surface)')
  const { layer, pixels } = sweeper(splash.art, splash.edge, 'right')
  root.append(layer, pixels)
  document.body.append(root)
  overlay = root
  if (reducedMotion()) {
    layer.style.clipPath = 'inset(0 0 0 0)'
    pixels.remove()
    return
  }
  root.style.clipPath = clipOf(from)
  root.getBoundingClientRect()
  root.style.transition = `clip-path ${GROW_MS}ms ${EASE}`
  root.style.clipPath = 'inset(0 0 0 0 round 0)'
  await wait(GROW_MS)
  // A varredura segue enquanto a navegação começa por baixo.
  swept = sweep(layer, pixels, 'right')
}

// Chamado pela tela do sistema quando ela já está desenhada por baixo.
export async function arriveInWorld(): Promise<void> {
  const root = overlay
  if (!root) return
  overlay = undefined
  await swept
  if (!reducedMotion()) {
    root.style.transition = `opacity ${FADE_MS}ms ease-out`
    root.style.opacity = '0'
    await wait(FADE_MS)
  }
  root.remove()
}

// Chamado pela ficha ao sair para o Nexus: a cor cobre a tela antes da troca de
// página, para o Nexus não aparecer por baixo antes da varredura.
export function coverForReturn() {
  if (!last || reducedMotion()) return
  leaveOverlay()
  const root = cover(last.art)
  document.body.append(root)
  overlay = root
}

// Chamado pela página do Nexus quando ela já entrou: o neutro varre da esquerda
// para a direita e devolve a tela.
export async function returnFromWorld(): Promise<void> {
  const root = overlay
  if (!root || !last) return
  overlay = undefined
  const { layer, pixels } = sweeper('var(--color-surface)', 'var(--color-surface)', 'left')
  root.append(layer, pixels)
  await sweep(layer, pixels, 'left')
  root.style.transition = `opacity ${FADE_MS}ms ease-out`
  root.style.opacity = '0'
  await wait(FADE_MS)
  root.remove()
}

function leaveOverlay() {
  overlay?.remove()
  overlay = undefined
  swept = Promise.resolve()
}
