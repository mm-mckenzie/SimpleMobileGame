import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
  base: isProd ? '/SimpleMobileGame/' : '/',
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-*.png'],
      manifest: {
        name: 'MYCELIUM',
        short_name: 'Mycelium',
        description: 'Grow. Consume. Evolve. A hex-grid fungal strategy game.',
        theme_color: '#00ffcc',
        background_color: '#0a0e1a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/SimpleMobileGame/',
        scope: '/SimpleMobileGame/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        runtimeCaching: [],
      },
    }),
  ],
});
