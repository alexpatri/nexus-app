import '@fontsource-variable/atkinson-hyperlegible-next'
import '@fontsource/barlow-condensed/400.css'
import '@fontsource/barlow-condensed/500.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import '@fontsource/michroma/400.css'

import type { Theme, ThemeFont } from '@/design/contract'
import { nexusTheme } from '@/design/nexus.theme'

// Texto e títulos são do Nexus; o Shadowrun traz a fonte dos números e o
// Michroma, que só aparece no nome do cartão SIN.
const body: ThemeFont = { family: "'Atkinson Hyperlegible Next Variable', system-ui, sans-serif" }
const michroma: ThemeFont = {
  family: "'Michroma', 'Atkinson Hyperlegible Next Variable', sans-serif",
}
const barlow: ThemeFont = {
  family: "'Barlow Condensed', 'Atkinson Hyperlegible Next Variable', sans-serif",
}

const font = { body, display: michroma, numeric: barlow }
const shape = nexusTheme.shape

// A anatomia é a do Nexus: as mesmas superfícies, fios e textos. O sistema
// troca a tinta (carmim) e a fonte dos números (frontend-design-shadowrun.md).
export const shadowrunTheme = {
  scheme: 'light',
  color: {
    ...nexusTheme.color,
    accent: '#8E1B1E',
    onAccent: '#FFFFFF',
    focus: '#8E1B1E',
  },
  font,
  shape,
} satisfies Theme

// Mapeado, ainda sem uso: a página vira o carvão das tabelas do livro e o
// âmbar passa a ser a cor de todo dado.
export const shadowrunDarkTheme = {
  scheme: 'dark',
  color: {
    surface: '#17181B',
    surfaceRaised: '#222428',
    surfaceSunken: '#0F1012',
    text: '#E8E6E1',
    textMuted: '#A3A6AC',
    border: '#A3A6AC',
    rule: '#3A3D43',
    accent: '#9E2024',
    onAccent: '#FFFFFF',
    danger: '#FF6B5E',
    onDanger: '#17181B',
    success: '#4FC08D',
    focus: '#F0B429',
  },
  font,
  shape,
} satisfies Theme
