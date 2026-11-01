import { ref } from 'vue'

export const textSizes = [
  { id: 'default', label: 'Padrão', scale: 1 },
  { id: 'large', label: 'Grande', scale: 1.15 },
  { id: 'larger', label: 'Maior', scale: 1.3 },
] as const

export type TextSize = (typeof textSizes)[number]['id']

const KEY = 'nexus.textSize'

function read(): TextSize {
  try {
    const v = localStorage.getItem(KEY)
    return textSizes.some((s) => s.id === v) ? (v as TextSize) : 'default'
  } catch {
    return 'default'
  }
}

export const textSize = ref<TextSize>(read())

// Em porcentagem, e não em px, para partir do tamanho que a pessoa já escolheu
// no navegador ou no sistema; o app inteiro está em rem e acompanha.
export function applyTextSize(size: TextSize, root = document.documentElement) {
  const scale = textSizes.find((s) => s.id === size)!.scale
  root.style.fontSize = scale === 1 ? '' : `${scale * 100}%`
}

export function setTextSize(size: TextSize) {
  textSize.value = size
  applyTextSize(size)
  try {
    localStorage.setItem(KEY, size)
  } catch {
    // Sem armazenamento, a escolha vale só até fechar o app.
  }
}
