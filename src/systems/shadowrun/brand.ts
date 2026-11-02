import type { Brand } from '@/design/contract'
import ShadowrunMark from './ui/ShadowrunMark.vue'

// A faixa é o cabeçalho das páginas do livro: carmim que escurece até o carvão,
// com a borda pixelada embaixo.
export const shadowrunBrand = {
  name: 'Shadowrun',
  edition: '5ª edição',
  mark: ShadowrunMark,
  accent: '#8E1B1E',
  ink: '#FFFFFF',
  cardArt:
    'linear-gradient(90deg, #1E1F22 0 6px, rgb(30 31 34 / 0%) 6px 10px, #1E1F22 10px 14px, rgb(30 31 34 / 0%) 14px 24px, #1E1F22 24px 28px, rgb(30 31 34 / 0%) 28px 38px) left bottom / 38px 4px repeat-x, linear-gradient(90deg, #8E1B1E 0%, #6E1215 50%, #1E1F22 100%)',
} satisfies Brand
