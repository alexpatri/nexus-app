import type { Theme } from './contract'
import { mix, parseHex } from './color'

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())

// O tema vai na raiz do documento, e não num contêiner da tela: modais,
// popovers e toasts do Ionic são renderizados fora da árvore da tela.
export function applyTheme(theme: Theme, system: string, root = document.documentElement) {
  const set = (name: string, value: string) => root.style.setProperty(name, value)

  root.dataset.system = system
  root.style.colorScheme = theme.scheme
  for (const [name, value] of Object.entries(theme.color)) {
    set(`--color-${kebab(name)}`, value)
    set(`--color-${kebab(name)}-rgb`, parseHex(value).join(', '))
  }
  // Mesma conta do Ionic para shade e tint, que ele usa no estado pressionado.
  for (const name of ['accent', 'danger'] as const) {
    set(`--color-${name}-shade`, mix(theme.color[name], '#000000', 0.12))
    set(`--color-${name}-tint`, mix(theme.color[name], '#FFFFFF', 0.1))
  }
  // O Ionic usa os passos para fundos de estado e textos secundários; sem eles,
  // cai nos valores do tema claro padrão dele.
  for (let step = 50; step < 1000; step += 50) {
    set(
      `--ion-background-color-step-${step}`,
      mix(theme.color.surface, theme.color.text, step / 1000),
    )
    set(`--ion-text-color-step-${step}`, mix(theme.color.text, theme.color.surface, step / 1000))
  }
  for (const [name, font] of Object.entries(theme.font)) {
    set(`--font-${name}`, font.family)
  }
  for (const [name, value] of Object.entries(theme.shape)) {
    set(`--${kebab(name)}`, value)
  }

  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.append(meta)
  }
  meta.content = theme.color.surface
}
