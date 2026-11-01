import { session, type User } from '@/core/session/session'
import { deviceName } from '@/core/session/device'

import { createClient } from './client'

export const core = createClient({
  baseUrl: import.meta.env.VITE_CORE_URL ?? 'http://localhost:8080',
  token: () => session.state.token,
  onUnauthorized: () => {
    void session.clear()
  },
})

interface AuthResponse {
  token: string
  user: User
}

export async function register(name: string, email: string, password: string) {
  const { data } = await core.post<AuthResponse>('/auth/register', {
    name,
    email,
    password,
    deviceName: deviceName(),
  })
  await session.signIn(data.token, data.user)
}

export async function login(email: string, password: string) {
  const { data } = await core.post<AuthResponse>('/auth/login', {
    email,
    password,
    deviceName: deviceName(),
  })
  await session.signIn(data.token, data.user)
}

export async function logout() {
  try {
    await core.post('/auth/logout')
  } catch {
    // Sem conexão, a sessão sai do aparelho mesmo assim; no servidor ela vence sozinha.
  }
  await session.clear()
}

// Ao contrário do logout, só limpa o aparelho se o servidor confirmar: quem
// pede isso quer derrubar as outras sessões.
export async function logoutAll() {
  await core.post('/auth/logout-all')
  await session.clear()
}

export async function updateName(name: string) {
  const { data } = await core.patch<User>('/me', { name })
  await session.updateUser(data)
}

export async function changePassword(currentPassword: string, newPassword: string) {
  await core.put('/me/password', { currentPassword, newPassword })
}

export async function refreshMe() {
  const { data } = await core.get<User>('/me')
  await session.updateUser(data)
}
