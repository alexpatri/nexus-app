<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import { watch } from 'vue'
import { useRouter } from 'vue-router'

import { session } from '@/core/session/session'

const router = useRouter()

// Um 401 em qualquer chamada limpa a sessão; aqui o app volta para o login.
watch(
  () => session.state.token,
  (token) => {
    if (!token && !router.currentRoute.value.meta.public) router.replace({ name: 'auth' })
  },
)
</script>

<template>
  <IonApp>
    <IonRouterOutlet />
  </IonApp>
</template>
