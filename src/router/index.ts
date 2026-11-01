import { createRouter, createWebHistory } from '@ionic/vue-router'

import { session } from '@/core/session/session'
import AuthPage from '@/features/auth/AuthPage.vue'
import CharactersPage from '@/features/characters/CharactersPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/entrar', name: 'auth', component: AuthPage, meta: { public: true } },
    { path: '/', name: 'characters', component: CharactersPage },
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

export default router
