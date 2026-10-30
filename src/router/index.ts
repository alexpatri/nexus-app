import { createRouter, createWebHistory } from '@ionic/vue-router'

import CharactersPage from '@/features/characters/CharactersPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [{ path: '/', name: 'characters', component: CharactersPage }],
})

export default router
