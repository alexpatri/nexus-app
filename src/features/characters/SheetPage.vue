<script setup lang="ts">
import { IonContent, IonPage, onIonViewWillEnter, onIonViewWillLeave } from '@ionic/vue'
import { computed, ref, shallowRef } from 'vue'

import { messageFor } from '@/core/api/messages'
import { catalogs } from '@/core/catalog/catalogs'
import type { RulesSystem } from '@/core/rules/system'
import { type OpenSheet, openSheet } from '@/core/sheets/open'
import NxBar from '@/core/ui/NxBar.vue'
import { arriveInWorld } from '@/core/ui/world'
import { applyTheme } from '@/design/apply'
import { moduleFor, type SystemModule, type SystemWorld } from '@/systems'

const props = defineProps<{ id: string; step?: string }>()

const open = shallowRef<OpenSheet>()
const module = shallowRef<SystemModule>()
const world = shallowRef<SystemWorld>()
const rules = shallowRef<RulesSystem>()
const error = ref('')
const ready = computed(() => open.value && world.value && rules.value)

async function load() {
  open.value = await openSheet(props.id)
  module.value = moduleFor(open.value.sheet.system, open.value.sheet.systemVersion)
  if (!module.value) {
    error.value = 'Este sistema ainda não tem telas no app.'
    return
  }
  world.value = await module.value.load()
  applyTheme(world.value.theme, module.value.id)
  rules.value = await world.value.rules(catalogs)
}

onIonViewWillEnter(async () => {
  if (world.value && module.value) applyTheme(world.value.theme, module.value.id)
  if (!ready.value) {
    try {
      await load()
    } catch (err) {
      error.value = messageFor(err)
    }
  }
  await arriveInWorld()
})

onIonViewWillLeave(() => {
  void open.value?.autosave.flush()
})
</script>

<template>
  <IonPage>
    <component
      :is="world!.Creation"
      v-if="ready && !error"
      :open="open!"
      :rules="rules!"
      :step="step"
    />
    <template v-else>
      <NxBar back="/" back-label="Voltar para personagens" />
      <IonContent>
        <main class="content">
          <p v-if="error" role="alert" class="error">{{ error }}</p>
          <p v-else class="loading">Abrindo a ficha…</p>
        </main>
      </IonContent>
    </template>
  </IonPage>
</template>

<style scoped>
.content {
  padding: var(--space-4);
}

.error {
  margin: 0;
  font-weight: 600;
  color: var(--color-danger);
}

.loading {
  margin: 0;
  color: var(--color-text-muted);
}
</style>
