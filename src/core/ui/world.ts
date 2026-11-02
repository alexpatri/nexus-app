// A passagem para o mundo de um sistema (frontend-design-nexus.md): a faixa do
// cartão cresce até cobrir a tela, mostra o sistema e o progresso enquanto a
// ficha abre, e some quando a tela do sistema já está pronta por baixo. Na volta
// para Personagens, a faixa recolhe até o cartão. É o único movimento
// orquestrado do app.

const CLIP_MS = 420
const FADE_MS = 320
// Tempo mínimo da abertura depois de cobrir a tela, para ser lida mesmo com
// tudo em cache.
const HOLD_MS = 650
const STEPS = 6

// O que a abertura mostra; vem da marca do sistema.
export interface Splash {
  art: string
  ink: string
  name: string
  edition: string
  // Família da fonte de títulos do sistema, se ele tiver uma.
  display?: string
}

function reducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let overlay: HTMLElement | undefined
let coveredAt = 0
let lines: HTMLElement | undefined
let blocks: HTMLElement[] = []
// O personagem aberto por último, para a volta recolher até o cartão dele.
let opened: { characterId: string; splash: Splash } | undefined

function el<K extends keyof HTMLElementTagNameMap>(tag: K, style: Partial<CSSStyleDeclaration>) {
  const e = document.createElement(tag)
  Object.assign(e.style, style)
  return e
}

function build(splash: Splash): HTMLElement {
  const root = el('div', {
    position: 'fixed',
    inset: '0',
    zIndex: 'var(--z-world)',
    background: splash.art,
    color: splash.ink,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '14px',
    padding: '0 32px',
    pointerEvents: 'none',
    fontFamily: 'var(--font-body)',
  })
  const name = el('span', {
    fontFamily: splash.display ?? 'inherit',
    fontSize: '1.625rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  })
  name.textContent = splash.name
  const edition = el('span', { fontSize: '0.9375rem', opacity: '0.8' })
  edition.textContent = splash.edition
  const bar = el('div', {
    display: 'flex',
    gap: '3px',
    width: '100%',
    maxWidth: '260px',
    marginTop: '24px',
  })
  bar.setAttribute('aria-hidden', 'true')
  blocks = Array.from({ length: STEPS }, () => {
    const b = el('span', { flex: '1', height: '6px', background: 'currentColor', opacity: '0.25' })
    bar.append(b)
    return b
  })
  lines = el('div', {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    minHeight: '2.8em',
    fontSize: '0.9375rem',
  })
  lines.setAttribute('role', 'status')
  root.append(name, edition, bar, lines)
  return root
}

function clipOf(r: DOMRect) {
  const { innerWidth: w, innerHeight: h } = window
  return `inset(${r.top}px ${w - r.right}px ${h - r.bottom}px ${r.left}px round var(--nx-radius-card))`
}

export async function enterWorld(
  from: DOMRect,
  splash: Splash,
  characterId?: string,
): Promise<void> {
  leaveOverlay()
  opened = characterId ? { characterId, splash } : undefined
  const root = build(splash)
  document.body.append(root)
  overlay = root
  if (reducedMotion()) return
  root.style.opacity = '0'
  root.style.clipPath = clipOf(from)
  root.getBoundingClientRect()
  root.style.transition = `opacity ${FADE_MS}ms ease-out, clip-path ${CLIP_MS}ms cubic-bezier(0.2, 0.7, 0.2, 1)`
  root.style.opacity = '1'
  root.style.clipPath = 'inset(0 0 0 0 round 0)'
  await wait(CLIP_MS)
  coveredAt = performance.now()
}

// Uma linha de progresso na abertura; done é a fração já carregada.
export function worldStatus(text: string, done: number) {
  if (!lines) return
  const line = document.createElement('span')
  line.textContent = text
  lines.append(line)
  while (lines.children.length > 2) lines.firstElementChild?.remove()
  const filled = Math.round(Math.min(1, done) * STEPS)
  blocks.forEach((b, i) => (b.style.opacity = i < filled ? '1' : '0.25'))
}

// Chamado pela tela do sistema quando ela já está desenhada por baixo.
export async function arriveInWorld(): Promise<void> {
  const root = overlay
  if (!root) return
  overlay = undefined
  if (!reducedMotion()) {
    await wait(Math.max(0, HOLD_MS - (performance.now() - coveredAt)))
    root.style.transition = `opacity ${FADE_MS}ms ease-out`
    root.style.opacity = '0'
    await wait(FADE_MS)
  }
  root.remove()
}

// Chamado pela ficha ao sair para Personagens: a faixa cobre a tela antes da
// troca de página, para a lista não aparecer por baixo antes da hora.
export function coverForReturn() {
  if (!opened || reducedMotion()) return
  leaveOverlay()
  const root = build(opened.splash)
  root.replaceChildren()
  document.body.append(root)
  overlay = root
}

// Chamado por Personagens quando a página já entrou: a faixa recolhe até o
// cartão do personagem que estava aberto.
export async function returnToCard(find: (characterId: string) => Element | null) {
  const root = overlay
  const from = opened
  opened = undefined
  if (!root || !from) return
  overlay = undefined
  const card = find(from.characterId)
  if (card) {
    root.style.transition = `clip-path ${CLIP_MS}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${FADE_MS}ms ease-in ${CLIP_MS - 120}ms`
    root.style.clipPath = clipOf(card.getBoundingClientRect())
  } else {
    root.style.transition = `opacity ${FADE_MS}ms ease-out`
  }
  root.style.opacity = '0'
  await wait(CLIP_MS + FADE_MS)
  root.remove()
}

function leaveOverlay() {
  overlay?.remove()
  overlay = undefined
  lines = undefined
  blocks = []
}
