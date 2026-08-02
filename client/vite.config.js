import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // injectManifest (custom src/sw.js) instead of the default generateSW,
      // so the service worker can also handle push/notificationclick events
      // for browser push notifications — generateSW only supports declarative
      // caching config, no room for custom event listeners.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
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
      // API calls aren't precached and no route is registered for them in
      // src/sw.js, so they pass straight through to the network untouched —
      // equivalent to generateSW's NetworkOnly, just by omission rather than
      // config. Navigation fallback (with /api/ and /uploads/ excluded) is
      // implemented directly in src/sw.js instead of here, since injectManifest
      // mode doesn't read the `workbox` option generateSW does.
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
