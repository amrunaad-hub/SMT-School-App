import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'SMT English Medium School',
        short_name: 'SMT School',
        description: 'Student, teacher, principal and parent portal for SMT English Medium School.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f3f4f6',
        theme_color: '#1e3a8a',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Never cache API responses — attendance/notices/etc. must always be fresh.
        // Precaching covers the app shell (JS/CSS/HTML) so it still loads offline.
        // /uploads/ must also be excluded: it serves real files (PDFs, images)
        // directly, and without this the SW's navigation fallback intercepts
        // clicks on those links and serves index.html instead — looks like the
        // app just "reloads" instead of opening/downloading the file.
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
  build: {
    outDir: 'build',
  },
});
