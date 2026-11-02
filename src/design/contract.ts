import type { Component } from 'vue'

export interface ThemeFont {
  family: string
}

export interface Theme {
  scheme: 'light' | 'dark'
  color: {
    surface: string
    surfaceRaised: string
    surfaceSunken: string
    text: string
    textMuted: string
    border: string
    // Decorativo: divisórias. Borda que identifica controle usa border.
    rule: string
    accent: string
    onAccent: string
    danger: string
    onDanger: string
    // Regra atendida, como na lista de exigências da senha.
    success: string
    focus: string
  }
  font: {
    body: ThemeFont
    display: ThemeFont
    // Precisa ter tnum; a ficha é cheia de números alinhados em coluna.
    numeric: ThemeFont
  }
  shape: {
    radiusControl: string
    radiusSheet: string
    borderWidth: string
  }
}

export interface Brand {
  name: string
  edition: string
  mark: Component
  accent: string
  // Texto sobre a faixa do cartão.
  ink: string
  // Fundo CSS da faixa do cartão; sem ele, a faixa é accent. O teste de
  // contraste confere ink sobre cada cor #RRGGBB que aparece aqui.
  cardArt?: string
}
