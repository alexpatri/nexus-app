import { del, get, set } from 'idb-keyval'
import { reactive, readonly } from 'vue'

export interface User {
  id: string
  name: string
  email: string
}

interface Stored {
  token: string
  user: User
}

const KEY = 'session'

const state = reactive<{ token?: string; user?: User }>({})

// Sem IndexedDB (janela privada em alguns navegadores), a sessão vale só
// enquanto o app estiver aberto.
async function persist(stored: Stored | undefined) {
  try {
    await (stored ? set(KEY, stored) : del(KEY))
  } catch {
    // Segue só em memória.
  }
}

// O perfil fica em cache junto do token: o app abre sem conexão e só pede
// login quando uma chamada à API responder 401.
export const session = {
  state: readonly(state),

  async load() {
    try {
      const stored = await get<Stored>(KEY)
      state.token = stored?.token
      state.user = stored?.user
    } catch {
      // Abre sem sessão.
    }
  },

  async signIn(token: string, user: User) {
    state.token = token
    state.user = user
    await persist({ token, user })
  },

  async updateUser(user: User) {
    state.user = user
    if (state.token) await persist({ token: state.token, user })
  },

  async clear() {
    state.token = undefined
    state.user = undefined
    await persist(undefined)
  },
}
