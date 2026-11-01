<script setup lang="ts">
import { IonContent, IonPage, useIonRouter } from '@ionic/vue'
import { computed, ref } from 'vue'

import { login, register } from '@/core/api/core'
import { messageFor } from '@/core/api/messages'
import NxButton from '@/core/ui/NxButton.vue'
import NxField from '@/core/ui/NxField.vue'
import NxPasswordRules from '@/core/ui/NxPasswordRules.vue'
import { firstError, loginSchema, registerSchema } from '@/core/validation/auth'
import NexusMark from '@/design/NexusMark.vue'

const router = useIonRouter()

const mode = ref<'login' | 'register'>('login')
const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

const isRegister = computed(() => mode.value === 'register')

function toggleMode() {
  mode.value = isRegister.value ? 'login' : 'register'
  error.value = ''
}

// Confere no aparelho o que dá para conferir, para não gastar tentativa no
// limite do servidor; quem decide é o core.
async function submit() {
  const action = isRegister.value ? validRegister() : validLogin()
  if (!action) return
  busy.value = true
  try {
    await action()
    router.replace('/')
  } catch (err) {
    error.value = messageFor(err)
  } finally {
    busy.value = false
  }
}

function validRegister() {
  const parsed = registerSchema.safeParse({
    name: name.value,
    email: email.value,
    password: password.value,
  })
  error.value = firstError(parsed)
  if (!parsed.success) return
  const { data } = parsed
  return () => register(data.name, data.email, data.password)
}

function validLogin() {
  const parsed = loginSchema.safeParse({ email: email.value, password: password.value })
  error.value = firstError(parsed)
  if (!parsed.success) return
  const { data } = parsed
  return () => login(data.email, data.password)
}
</script>

<template>
  <IonPage>
    <IonContent>
      <main class="auth">
        <div class="brand">
          <NexusMark class="mark" />
          <span>Nexus</span>
        </div>

        <div class="intro">
          <h1>{{ isRegister ? 'Criar conta' : 'Entrar' }}</h1>
          <p>
            {{
              isRegister
                ? 'Uma conta guarda suas fichas e deixa continuar em outro aparelho.'
                : 'Suas fichas estão na sua conta.'
            }}
          </p>
        </div>

        <form novalidate @submit.prevent="submit">
          <NxField v-if="isRegister" v-model="name" label="Nome" autocomplete="name" />
          <NxField
            v-model="email"
            label="E-mail"
            type="email"
            inputmode="email"
            autocomplete="email"
          />
          <NxField
            v-model="password"
            label="Senha"
            type="password"
            :autocomplete="isRegister ? 'new-password' : 'current-password'"
          >
            <NxPasswordRules v-if="isRegister" :password="password" />
          </NxField>
          <p v-if="error" role="alert" class="error">{{ error }}</p>
          <NxButton type="submit" :busy="busy">{{
            isRegister ? 'Criar conta' : 'Entrar'
          }}</NxButton>
        </form>

        <div class="switch">
          <span>{{ isRegister ? 'Já tem conta?' : 'Ainda não tem conta?' }}</span>
          <button type="button" @click="toggleMode">
            {{ isRegister ? 'Entrar' : 'Criar conta' }}
          </button>
        </div>
      </main>
    </IonContent>
  </IonPage>
</template>

<style scoped>
.auth {
  min-height: 100%;
  box-sizing: border-box;
  max-width: 480px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: calc(56px + env(safe-area-inset-top)) var(--space-5)
    calc(var(--space-6) + env(safe-area-inset-bottom));
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.mark {
  width: 26px;
  height: 26px;
}

.intro {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

h1 {
  margin: 0;
  font-size: 1.875rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.intro p {
  margin: 0;
  font-size: var(--text-md);
  line-height: 1.5;
  color: var(--color-text-muted);
}

form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.error {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.45;
  font-weight: 600;
  color: var(--color-danger);
}

.switch {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: var(--text-sm);
}

.switch span {
  color: var(--color-text-muted);
}

.switch button {
  min-height: var(--touch-min);
  padding: 0 6px;
  border: 0;
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}
</style>
