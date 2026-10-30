import '@fontsource-variable/atkinson-hyperlegible-next'

import type { Theme, ThemeFont } from './contract'

const atkinsonNext: ThemeFont = {
  family: "'Atkinson Hyperlegible Next Variable', system-ui, sans-serif",
}

export const nexusTheme = {
  scheme: 'light',
  color: {
    surface: '#F6F6F4',
    surfaceRaised: '#FFFFFF',
    surfaceSunken: '#ECECE9',
    text: '#1E2126',
    textMuted: '#5B6068',
    border: '#5B6068',
    rule: '#D9DAD6',
    accent: '#1E2126',
    onAccent: '#FFFFFF',
    danger: '#B3261E',
    onDanger: '#FFFFFF',
    focus: '#1E2126',
  },
  font: {
    body: atkinsonNext,
    display: atkinsonNext,
    numeric: atkinsonNext,
  },
  shape: {
    radiusControl: '8px',
    radiusSheet: '16px',
    borderWidth: '1px',
  },
} satisfies Theme
