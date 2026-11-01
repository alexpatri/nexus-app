import { createRouter, createWebHistory } from '@ionic/vue-router'

import { session } from '@/core/session/session'
import { applyTheme } from '@/design/apply'
import { nexusTheme } from '@/design/nexus.theme'
import AuthPage from '@/features/auth/AuthPage.vue'
import CharactersPage from '@/features/characters/CharactersPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/entrar', name: 'auth', component: AuthPage, meta: { public: true } },
    { path: '/', name: 'characters', component: CharactersPage },
    {
      path: '/novo',
      name: 'new-character',
      component: () => import('@/features/characters/NewCharacterPage.vue'),
    },
    {
      path: '/fichas/:id/:step?',
      name: 'sheet',
      component: () => import('@/features/characters/SheetPage.vue'),
      props: true,
      meta: { world: true },
    },
    {
      path: '/conta',
      name: 'account',
      component: () => import('@/features/account/AccountPage.vue'),
    },
    {
      path: '/conta/senha',
      name: 'change-password',
      component: () => import('@/features/account/ChangePasswordPage.vue'),
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to) => {
  const signedIn = !!session.state.token
  if (!to.meta.public && !signedIn) return { name: 'auth' }
  if (to.name === 'auth' && signedIn) return { name: 'characters' }
})

// Fora das telas de um sistema, o tema é do Nexus. A tela do sistema aplica o
// dela quando sabe qual é.
router.afterEach((to) => {
  if (!to.meta.world) applyTheme(nexusTheme, 'nexus')
})

export default router
