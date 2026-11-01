import { describe, expect, it } from 'vitest'

import {
  changePasswordSchema,
  checkPassword,
  firstError,
  loginSchema,
  registerSchema,
} from './auth'

const missing = (p: string) =>
  checkPassword(p)
    .filter((r) => !r.ok)
    .map((r) => r.id)

// Os mesmos casos de internal/auth/password_test.go no core.
describe('checkPassword', () => {
  it.each([
    ['Senha-Forte1', []],
    ['12345678', ['upper', 'lower', 'special']],
    ['Ab1!', ['length']],
    ['Ab1!' + 'a'.repeat(69), ['length']],
    ['Ab1!' + 'a'.repeat(68), []],
    ['senhaforte1!', ['upper']],
    ['SENHAFORTE1!', ['lower']],
    ['SenhaForte!!', ['digit']],
    ['SenhaForte12', ['special']],
    ['Senha Forte1', ['special']],
    ['Ação-çãoÉ1', []],
    ['Áéíóú1!x', []],
    ['', ['length', 'upper', 'lower', 'digit', 'special']],
  ])('%j', (password, want) => {
    expect(missing(password)).toEqual(want)
  })

  it('conta caracteres no mínimo, não bytes', () => {
    expect(missing('Çé1!ãõâ')).toContain('length')
    expect(missing('Çé1!ãõâê')).not.toContain('length')
  })

  it('troca o rótulo do tamanho quando passa de 72 bytes', () => {
    expect(checkPassword('Ab1!' + 'a'.repeat(69))[0]!.label).toBe('No máximo 72 caracteres')
  })
})

describe('schemas', () => {
  it('normaliza o e-mail como o core', () => {
    const r = loginSchema.safeParse({ email: ' Alex@Exemplo.COM ', password: 'x' })
    expect(r.success && r.data.email).toBe('alex@exemplo.com')
  })

  it.each(['alex@gmail', 'alex@gmail.c', 'sem-arroba', 'a b@x.com'])(
    'recusa o e-mail %j',
    (email) => {
      expect(firstError(loginSchema.safeParse({ email, password: 'x' }))).toBe(
        'Informe um e-mail válido.',
      )
    },
  )

  it('mostra o primeiro erro na ordem dos campos', () => {
    const r = registerSchema.safeParse({ name: ' ', email: 'x', password: '1' })
    expect(firstError(r)).toBe('Informe seu nome.')
  })

  it('recusa senha nova fora das regras', () => {
    const r = changePasswordSchema.safeParse({ currentPassword: 'velha', newPassword: '12345678' })
    expect(firstError(r)).toBe('A senha ainda não atende a todas as regras.')
  })

  it('aceita cadastro válido', () => {
    const r = registerSchema.safeParse({
      name: 'Alex',
      email: 'alex@mail.com.br',
      password: 'Senha-Forte1',
    })
    expect(r.success).toBe(true)
  })
})
