import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Relative base so the build also works when served from a subfolder or a USB
// stick on the shop tablet.
export default defineConfig({
  base: './',
  // The dev server and the order server are separate processes; proxying keeps
  // the app on one origin so `/api` works the same in dev and in production.
  server: {
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,gif,svg,woff2}'],
      },
      manifest: {
        name: 'Tailor Orders',
        short_name: 'Tailor',
        description: 'Measurements, reference photos and printable workshop order sheets.',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f2ece4',
        theme_color: '#20252a',
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
    }),
  ],
})
