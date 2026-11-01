import '@fontsource-variable/public-sans'

import type { Theme, ThemeFont } from '@/design/contract'

const publicSans: ThemeFont = {
  family: "'Public Sans Variable', system-ui, sans-serif",
}

// frontend-design-shadowrun.md, seção 1. success não está na spec: é o verde
// mais próximo do Nexus que passa 4,5:1 sobre o papel do Shadowrun.
export const shadowrunTheme = {
  scheme: 'light',
  color: {
    surface: '#E3E8E2',
    surfaceRaised: '#EEF2EC',
    surfaceSunken: '#D6DDD7',
    text: '#1B2333',
    textMuted: '#4F5D66',
    border: '#4F5D66',
    rule: '#9AA7A3',
    accent: '#2340A8',
    onAccent: '#FFFFFF',
    danger: '#A61E2D',
    onDanger: '#FFFFFF',
    success: '#146B44',
    focus: '#2340A8',
  },
  font: {
    body: publicSans,
    display: publicSans,
    numeric: publicSans,
  },
  shape: {
    radiusControl: '2px',
    radiusSheet: '12px',
    borderWidth: '1px',
  },
} satisfies Theme
