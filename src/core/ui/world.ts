// A passagem para o mundo de um sistema (frontend-design-nexus.md): o cartão
// cresce e vira uma tela neutra do Nexus com o nome do sistema; a cor do
// sistema avança da direita para a esquerda junto com o carregamento, trocando
// a tinta do texto na fronteira; com a tela toda colorida, o nome passa para a
// fonte do sistema e a abertura some sobre a ficha pronta. Na volta para
// Personagens, a faixa recolhe até o cartão. É o único movimento orquestrado do
// app.

const CLIP_MS = 420
const FADE_MS = 320
// Tempo mínimo da abertura depois de cobrir a tela, para ser vista mesmo com
// tudo em cache.
const HOLD_MS = 1800
// A barra acende um bloco por vez, até onde o carregamento já chegou; a cor
// avança com ela.
const STEPS = 10
const BLOCK_MS = 140

// O que a abertura mostra; vem da marca do sistema.
export interface Splash {
  art: string
  // Cor sólida da marca, para a borda pixelada da frente da cor.
  edge: string
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

interface Opening {
  root: HTMLElement
  color: HTMLElement
  edge: HTMLElement
  blocks: HTMLElement[]
  plainName: HTMLElement
  displayName: HTMLElement
}

let overlay: HTMLElement | undefined
let opening: Opening | undefined
let coveredAt = 0
let lit = 0
let target = 0
let ticker: ReturnType<typeof setInterval> | undefined
let filled: (() => void) | undefined
// O personagem aberto por último, para a volta recolher até o cartão dele.
let opened: { characterId: string; splash: Splash } | undefined

function el<K extends keyof HTMLElementTagNameMap>(tag: K, style: Partial<CSSStyleDeclaration>) {
  const e = document.createElement(tag)
  Object.assign(e.style, style)
  return e
}

const layerStyle: Partial<CSSStyleDeclaration> = {
  position: 'absolute',
  inset: '0',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
  padding: '0 32px',
}

// Nome, edição e barra; a abertura tem duas cópias alinhadas, uma em cada tinta.
function content(splash: Splash, ink: string, withDisplay: boolean) {
  const layer = el('div', { ...layerStyle, color: ink })
  const name = el('span', { display: 'grid', placeItems: 'center' })
  const plain = el('span', {
    gridArea: '1 / 1',
    fontSize: '1.625rem',
    fontWeight: '800',
    letterSpacing: '-0.01em',
    transition: `opacity ${FADE_MS}ms ease-out`,
  })
  plain.textContent = splash.name
  name.append(plain)
  let display = plain
  if (withDisplay) {
    display = el('span', {
      gridArea: '1 / 1',
      fontFamily: splash.display ?? 'inherit',
      fontSize: '1.625rem',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      opacity: '0',
      transition: `opacity ${FADE_MS}ms ease-out`,
    })
    display.textContent = splash.name
    name.append(display)
  }
  const edition = el('span', { fontSize: '0.9375rem', opacity: '0.75' })
  edition.textContent = splash.edition
  const bar = el('div', {
    display: 'flex',
    gap: '4px',
    width: '100%',
    maxWidth: '260px',
    marginTop: '24px',
  })
  bar.setAttribute('aria-hidden', 'true')
  const blocks = Array.from({ length: STEPS }, () => {
    const b = el('span', {
      flex: '1',
      height: '6px',
      borderRadius: '3px',
      background: 'currentColor',
      opacity: '0.2',
      transition: 'opacity 120ms ease-out',
    })
    bar.append(b)
    return b
  })
  layer.append(name, edition, bar)
  return { layer, blocks, plain, display }
}

function build(splash: Splash): Opening {
  const root = el('div', {
    position: 'fixed',
    inset: '0',
    zIndex: 'var(--z-world)',
    background: 'var(--color-surface)',
    pointerEvents: 'none',
    fontFamily: 'var(--font-body)',
    overflow: 'hidden',
  })
  root.setAttribute('role', 'progressbar')
  root.setAttribute('aria-label', `Abrindo ${splash.name}`)
  const neutral = content(splash, 'var(--color-text)', false)
  const color = el('div', {
    position: 'absolute',
    inset: '0',
    background: splash.art,
    clipPath: 'inset(0 0 0 100%)',
    transition: `clip-path ${BLOCK_MS}ms linear`,
  })
  const tinted = content(splash, splash.ink, true)
  color.append(tinted.layer)
  // Borda pixelada da frente da cor, como a do cabeçalho do livro, na vertical.
  const edge = el('div', {
    position: 'absolute',
    top: '0',
    bottom: '0',
    left: '100%',
    width: '10px',
    transform: 'translateX(-100%)',
    background: `linear-gradient(180deg, ${splash.edge} 0 8px, transparent 8px 14px, ${splash.edge} 14px 18px, transparent 18px 30px, ${splash.edge} 30px 36px, transparent 36px 46px) left top / 5px 46px repeat-y, linear-gradient(180deg, transparent 0 4px, ${splash.edge} 4px 10px, transparent 10px 24px, ${splash.edge} 24px 28px, transparent 28px 40px) right top / 5px 40px repeat-y`,
    transition: `left ${BLOCK_MS}ms linear`,
  })
  root.append(neutral.layer, color, edge)
  return {
    root,
    color,
    edge,
    blocks: [...neutral.blocks, ...tinted.blocks],
    plainName: tinted.plain,
    displayName: tinted.display,
  }
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
  opening = build(splash)
  const { root } = opening
  document.body.append(root)
  overlay = root
  coveredAt = performance.now()
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

// Quanto do carregamento já foi feito (0 a 1); a barra e a cor avançam até lá.
export function worldProgress(done: number) {
  advanceTo(Math.round(Math.min(1, done) * STEPS))
}

function paint() {
  if (!opening) return
  const { blocks, color, edge, plainName, displayName } = opening
  blocks.forEach((b, i) => (b.style.opacity = i % STEPS < lit ? '1' : '0.2'))
  const left = 100 - (lit / STEPS) * 100
  color.style.clipPath = `inset(0 0 0 ${left}%)`
  edge.style.left = `${left}%`
  if (lit >= STEPS) {
    edge.style.opacity = '0'
    plainName.style.opacity = '0'
    displayName.style.opacity = '1'
  }
}

function advanceTo(n: number) {
  if (!opening) return
  target = Math.max(target, n)
  ticker ??= setInterval(() => {
    if (lit < target) {
      lit++
      paint()
    }
    if (lit >= target) {
      clearInterval(ticker)
      ticker = undefined
      if (lit >= STEPS) filled?.()
    }
  }, BLOCK_MS)
}

// A cor termina de cobrir a tela antes de a abertura sair.
function fillAll(): Promise<void> {
  if (!opening || lit >= STEPS) return Promise.resolve()
  return new Promise((resolve) => {
    filled = resolve
    advanceTo(STEPS)
  })
}

// Chamado pela tela do sistema quando ela já está desenhada por baixo.
export async function arriveInWorld(): Promise<void> {
  const root = overlay
  if (!root) return
  await fillAll()
  overlay = undefined
  if (!reducedMotion()) {
    await wait(Math.max(0, HOLD_MS - (performance.now() - coveredAt)))
    root.style.transition = `opacity ${FADE_MS}ms ease-out`
    root.style.opacity = '0'
    await wait(FADE_MS)
  }
  root.remove()
  opening = undefined
}

// Chamado pela ficha ao sair para Personagens: a faixa cobre a tela antes da
// troca de página, para a lista não aparecer por baixo antes da hora.
export function coverForReturn() {
  if (!opened || reducedMotion()) return
  leaveOverlay()
  const root = el('div', {
    position: 'fixed',
    inset: '0',
    zIndex: 'var(--z-world)',
    background: opened.splash.art,
    pointerEvents: 'none',
  })
  root.setAttribute('aria-hidden', 'true')
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
  opening = undefined
  lit = 0
  target = 0
  clearInterval(ticker)
  ticker = undefined
  filled = undefined
}
