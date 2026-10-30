import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Nexus',
        short_name: 'Nexus',
        description: 'Fichas de RPG de vários sistemas, no celular e na web.',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        background_color: '#F6F6F4',
        theme_color: '#F6F6F4',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  build: {
    rolldownOptions: {
      treeshake: {
        // O @ionic/core não declara sideEffects, e cada componente que o
        // @ionic/vue importa ficaria no bundle. O registro do componente só
        // acontece quando o proxy do @ionic/vue é usado.
        moduleSideEffects: (id) => !/@ionic\/core\/components\/ion-[a-z-]+\.js$/.test(id),
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
