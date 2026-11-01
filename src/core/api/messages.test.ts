import { describe, expect, it } from 'vitest'

import { ApiError, NETWORK_ERROR } from './client'
import { messageFor } from './messages'

describe('messageFor', () => {
  it.each([
    [new ApiError(401, 'auth.invalidCredentials'), 'E-mail ou senha incorretos.'],
    [new ApiError(400, 'auth.invalidInput', { field: 'email' }), 'Informe um e-mail válido.'],
    [
      new ApiError(400, 'auth.invalidInput', { field: 'outro' }),
      'Confira os campos e tente de novo.',
    ],
    [
      new ApiError(429, 'auth.rateLimited', {}, [], 30),
      'Muitas tentativas. Tente de novo em 30 segundos.',
    ],
    [
      new ApiError(0, NETWORK_ERROR),
      'Sem conexão com o servidor. Confira a internet e tente de novo.',
    ],
    [new ApiError(400, 'auth.weakPassword'), 'A senha ainda não atende a todas as regras.'],
    [new ApiError(500, 'unknown'), 'Algo deu errado. Tente de novo.'],
    [new Error('qualquer'), 'Algo deu errado. Tente de novo.'],
  ])('%s', (err, want) => {
    expect(messageFor(err)).toBe(want)
  })
})
