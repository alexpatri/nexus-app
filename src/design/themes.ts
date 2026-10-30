import type { Theme } from './contract'
import { nexusTheme } from './nexus.theme'

// Todo tema registrado aqui passa pelo teste de contraste.
export const themes: Record<string, Theme> = {
  nexus: nexusTheme,
}
