import type { Brand } from '@/design/contract'
import ShadowrunMark from './ui/ShadowrunMark.vue'

// A faixa é o holograma do cartão SIN (--sr-holo em frontend-design-shadowrun.md).
export const shadowrunBrand = {
  name: 'Shadowrun',
  edition: '5ª edição',
  mark: ShadowrunMark,
  accent: '#2340A8',
  ink: '#1B2333',
  cardArt:
    'linear-gradient(115deg, #7FE0D2 0%, #C79BF2 28%, #F2D27F 52%, #9FD8F5 76%, #7FE0D2 100%)',
} satisfies Brand
