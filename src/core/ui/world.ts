// A passagem para o mundo de um sistema (frontend-design-nexus.md): a cor do
// sistema cresce a partir do cartão até cobrir a tela, e some quando a tela do
// sistema já está pronta por baixo. É o único movimento orquestrado do app.

const CLIP_MS = 420
const FADE_MS = 320

function reducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let overlay: HTMLElement | undefined

export async function enterWorld(from: DOMRect, color: string): Promise<void> {
  if (reducedMotion()) return
  leaveOverlay()
  const el = document.createElement('div')
  el.setAttribute('aria-hidden', 'true')
  const { innerWidth: w, innerHeight: h } = window
  Object.assign(el.style, {
    position: 'fixed',
    inset: '0',
    zIndex: 'var(--z-world)',
    background: color,
    opacity: '0',
    pointerEvents: 'none',
    clipPath: `inset(${from.top}px ${w - from.right}px ${h - from.bottom}px ${from.left}px round var(--nx-radius-card))`,
  })
  document.body.append(el)
  overlay = el
  el.getBoundingClientRect()
  el.style.transition = `opacity ${FADE_MS}ms ease-out, clip-path ${CLIP_MS}ms cubic-bezier(0.2, 0.7, 0.2, 1)`
  el.style.opacity = '1'
  el.style.clipPath = 'inset(0 0 0 0 round 0)'
  await wait(CLIP_MS)
}

// Chamado pela tela do sistema quando ela já está desenhada por baixo.
export async function arriveInWorld(): Promise<void> {
  const el = overlay
  if (!el) return
  overlay = undefined
  el.style.transition = `opacity ${FADE_MS}ms ease-out`
  el.style.opacity = '0'
  await wait(FADE_MS)
  el.remove()
}

function leaveOverlay() {
  overlay?.remove()
  overlay = undefined
}
