import {
  type ComputedRef,
  inject,
  type InjectionKey,
  provide,
  shallowRef,
  type ShallowRef,
} from 'vue'

// O que a tela atual põe no rodapé fixo da criação.
export interface Footer {
  status?: ComputedRef<string>
  // Violação que bloqueia: vai em carmim, com role="alert".
  alert?: ComputedRef<string>
  // Avançar fica desligado enquanto for true.
  blocked?: ComputedRef<boolean>
}

const key: InjectionKey<ShallowRef<Footer>> = Symbol('footer')

export function provideFooter() {
  const footer = shallowRef<Footer>({})
  provide(key, footer)
  return footer
}

export function useFooter(f: Footer) {
  const footer = inject(key, undefined)
  if (footer) footer.value = f
}
