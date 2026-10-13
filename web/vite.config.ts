import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from 'vite-plugin-pwa'
import basicSSL from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [
    // HTTPS local só sob opt-in (VITE_HTTPS=1) — fora disso quebra preview/prod.
    ...(process.env.VITE_HTTPS ? [basicSSL()] : []),
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: "auto",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'images' },
          },
        ],
      },
      devOptions: {
        enabled: true
      },
      includeAssets: ['*.png', '*.svg', 'robots.txt', 'sitemap.xml'],
      manifest: {
        id: '/',
        name: 'Minhas Finanças',
        short_name: 'Finanças',
        description: 'Controle seus gastos pessoais e alcance seus objetivos com sucesso',
        lang: 'pt-BR',
        dir: 'ltr',
        theme_color: '#9333ea',
        background_color: '#9333ea',
        orientation: "any",
        display: "standalone",
        scope: '/',
        start_url: '/',
        categories: ['finance', 'productivity'],
        icons: [
          {
            src: '192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
        ],
        shortcuts: [
          {
            name: 'Finanças',
            url: '/',
            icons: [{ src: '192.png', sizes: '192x192', type: 'image/png' }]
          },
          {
            name: 'Relatórios',
            url: '/reports',
            icons: [{ src: '192.png', sizes: '192x192', type: 'image/png' }]
          },
        ],
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
