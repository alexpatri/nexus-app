import { createApp } from 'vue'
import { IonicVue } from '@ionic/vue'

import '@ionic/vue/css/core.css'
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'

import './design/base.css'
import './design/ionic-bridge.css'

import App from './App.vue'
import router from './router'
import { applyTheme } from './design/apply'
import { nexusTheme } from './design/nexus.theme'
import { session } from './core/session/session'
import { applyTextSize, textSize } from './core/settings/textSize'

applyTheme(nexusTheme, 'nexus')
applyTextSize(textSize.value)

// A sessão vem do IndexedDB antes de o router entrar: a primeira navegação já
// passa pelo guard, que precisa saber se há login.
session.load().then(async () => {
  // O mesmo visual no Android e no iOS: a identidade é do Nexus e de cada sistema.
  const app = createApp(App).use(IonicVue, { mode: 'md' }).use(router)
  await router.isReady()
  app.mount('#app')
})
