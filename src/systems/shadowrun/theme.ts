import '@fontsource-variable/atkinson-hyperlegible-next'
import '@fontsource/barlow-condensed/400.css'
import '@fontsource/barlow-condensed/500.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import '@fontsource/michroma/400.css'

import type { Theme, ThemeFont } from '@/design/contract'

// O texto corrido é o do Nexus, para os sistemas conversarem com o shell; os
// títulos e os dados são do Shadowrun (frontend-design-shadowrun.md).
const body: ThemeFont = { family: "'Atkinson Hyperlegible Next Variable', system-ui, sans-serif" }
const michroma: ThemeFont = {
  family: "'Michroma', 'Atkinson Hyperlegible Next Variable', sans-serif",
}
const barlow: ThemeFont = {
  family: "'Barlow Condensed', 'Atkinson Hyperlegible Next Variable', sans-serif",
}

const font = { body, display: michroma, numeric: barlow }
const shape = { radiusControl: '8px', radiusSheet: '16px', borderWidth: '1px' }

// O papel do livro, um pouco mais claro para a troca com o shell ser suave,
// com carvão, carmim e âmbar.
export const shadowrunTheme = {
  scheme: 'light',
  color: {
    surface: '#EDEDE9',
    surfaceRaised: '#F8F8F5',
    surfaceSunken: '#DEDED9',
    text: '#1E1F22',
    textMuted: '#55585E',
    border: '#55585E',
    rule: '#C9CAC5',
    accent: '#8E1B1E',
    onAccent: '#FFFFFF',
    danger: '#B42318',
    onDanger: '#FFFFFF',
    success: '#146B44',
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
