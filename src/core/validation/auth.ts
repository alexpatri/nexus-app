import { z } from 'zod'

// Mesmas regras do core (internal/auth/password.go), na mesma ordem.
export type PasswordRuleId = 'length' | 'upper' | 'lower' | 'digit' | 'special'

export interface PasswordRule {
  id: PasswordRuleId
  label: string
  ok: boolean
}

const MAX_BYTES = 72

// O mínimo conta caracteres; o máximo conta bytes, porque o bcrypt do core
// ignora o que passa de 72.
export function checkPassword(password: string): PasswordRule[] {
  const tooLong = new TextEncoder().encode(password).length > MAX_BYTES
  return [
    {
      id: 'length',
      label: tooLong ? 'No máximo 72 caracteres' : 'Pelo menos 8 caracteres',
      ok: [...password].length >= 8 && !tooLong,
    },
    { id: 'upper', label: 'Uma letra maiúscula', ok: /\p{Lu}/u.test(password) },
    { id: 'lower', label: 'Uma letra minúscula', ok: /\p{Ll}/u.test(password) },
    { id: 'digit', label: 'Um número', ok: /\p{Nd}/u.test(password) },
    {
      id: 'special',
      label: 'Um caractere especial, como ! ou #',
      ok: /[^\p{L}\p{N}\s]/u.test(password),
    },
  ]
}

// O core usa o mesmo padrão: domínio com ponto e terminação de pelo menos duas letras.
export const EMAIL_PATTERN = /^[^\s@]+@([^\s@.]+\.)+[^\s@.]{2,}$/

const name = z.string().trim().min(1, 'Informe seu nome.')
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ pattern: EMAIL_PATTERN, error: 'Informe um e-mail válido.' }))
const newPassword = z
  .string()
  .refine((p) => checkPassword(p).every((r) => r.ok), 'A senha ainda não atende a todas as regras.')

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Informe sua senha.'),
})

export const registerSchema = z.object({ name, email, password: newPassword })

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual.'),
  newPassword,
})

export const nameSchema = name

// As telas mostram um erro por vez, acima do botão, na ordem dos campos.
export function firstError<T>(result: z.ZodSafeParseResult<T>): string {
  return result.success ? '' : (result.error.issues[0]?.message ?? '')
}
