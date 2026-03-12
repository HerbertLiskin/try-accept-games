import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['player_sprite.png', 'twilight_bg.png', 'underground_bg.png', 'noose_sprite.png', 'razor_sprite.png', 'coffin_sprite.png'],
      manifest: {
        name: 'Ridges of Depression',
        short_name: 'Ridges',
        description: 'A dark pixel art game about survival.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'landscape',
        icons: [
          {
            src: 'player_sprite.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,mp3,svg}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MiB
      }
    })
  ],
})
