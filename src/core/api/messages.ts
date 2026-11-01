import { ApiError, NETWORK_ERROR } from './client'

const fields: Record<string, string> = {
  name: 'Informe seu nome.',
  email: 'Informe um e-mail válido.',
}

const messages: Record<string, string> = {
  'auth.invalidCredentials': 'E-mail ou senha incorretos.',
  'auth.emailTaken': 'Já existe uma conta com esse e-mail. Entre com ela.',
  'auth.weakPassword': 'A senha ainda não atende a todas as regras.',
  'auth.wrongPassword': 'A senha atual está incorreta.',
  'auth.unauthenticated': 'Sua sessão terminou. Entre de novo.',
  [NETWORK_ERROR]: 'Sem conexão com o servidor. Confira a internet e tente de novo.',
}

// Mensagem para o usuário a partir do código do core; o texto é do app.
export function messageFor(err: unknown): string {
  if (!(err instanceof ApiError)) return 'Algo deu errado. Tente de novo.'
  if (err.code === 'auth.rateLimited') {
    return err.retryAfter
      ? `Muitas tentativas. Tente de novo em ${err.retryAfter} segundos.`
      : 'Muitas tentativas. Espere um pouco e tente de novo.'
  }
  if (err.code.endsWith('.invalidInput')) {
    return fields[String(err.params.field)] ?? 'Confira os campos e tente de novo.'
  }
  return messages[err.code] ?? 'Algo deu errado. Tente de novo.'
}
