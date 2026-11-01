import type { Theme } from './contract'
import { nexusTheme } from './nexus.theme'
import { shadowrunTheme } from '@/systems/shadowrun/theme'

// Todo tema registrado aqui passa pelo teste de contraste.
export const themes: Record<string, Theme> = {
  nexus: nexusTheme,
  shadowrun: shadowrunTheme,
}
