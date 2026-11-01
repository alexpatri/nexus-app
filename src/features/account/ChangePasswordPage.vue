<script setup lang="ts">
import { IonContent, IonPage, toastController, useIonRouter } from '@ionic/vue'
import { ref } from 'vue'

import { changePassword } from '@/core/api/core'
import { messageFor } from '@/core/api/messages'
import NxBar from '@/core/ui/NxBar.vue'
import NxButton from '@/core/ui/NxButton.vue'
import NxField from '@/core/ui/NxField.vue'
import NxPasswordRules from '@/core/ui/NxPasswordRules.vue'
import { changePasswordSchema, firstError } from '@/core/validation/auth'

const router = useIonRouter()

const current = ref('')
const next = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: current.value,
    newPassword: next.value,
  })
  error.value = firstError(parsed)
  if (!parsed.success) return
  busy.value = true
  try {
    await changePassword(parsed.data.currentPassword, parsed.data.newPassword)
    const toast = await toastController.create({
      message: 'Senha trocada. Os outros aparelhos precisam entrar de novo.',
      duration: 4000,
      position: 'bottom',
    })
    await toast.present()
    router.back()
  } catch (err) {
    error.value = messageFor(err)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <IonPage>
    <NxBar back="/conta">
      <h1>Trocar senha</h1>
    </NxBar>

    <IonContent>
      <main class="content">
        <form novalidate @submit.prevent="submit">
          <NxField
            v-model="current"
            label="Senha atual"
            type="password"
            autocomplete="current-password"
          />
          <NxField
            v-model="next"
            label="Senha nova"
            type="password"
            autocomplete="new-password"
            hint="Os outros aparelhos vão precisar entrar de novo."
          >
            <NxPasswordRules :password="next" />
          </NxField>
          <p v-if="error" role="alert" class="error">{{ error }}</p>
          <NxButton type="submit" :busy="busy">Trocar senha</NxButton>
        </form>
      </main>
    </IonContent>
  </IonPage>
</template>

<style scoped>
.content {
  max-width: 560px;
  padding: var(--space-2) var(--space-4) var(--space-5);
}

form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.error {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-danger);
}
</style>
