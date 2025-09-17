// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],

  // Keep builds lean
  nitro: {
    compressPublicAssets: true,
  },

  // ✅ Safe on current Nuxt; remove the deprecated flag
  // If you’re on Nuxt >= 3.6, you can keep renderJsonPayloads. If unsure, comment it out.
  experimental: {
    // payloadExtraction: true,            // ❌ remove (deprecated / can break)
    renderJsonPayloads: true,              // ✅ ok if your Nuxt supports it
  },

  // Don’t force a runtime for every API route; and don’t cache auth endpoints.
  // Add SWR only to non-auth, non-user-specific APIs.
  routeRules: {
    // Example (optional):
    // '/api/scheduler/overview': { swr: 15 },
    // Never put /api/auth/* behind SWR or special runtimes
  },

  app: {
    // router: { prefetchLinks: true } // Nuxt does smart prefetch by default
  },

  vite: {
    build: { sourcemap: false },
    optimizeDeps: {
      // include: ['dayjs', 'lodash-es'] // add if you have heavy deps
    }
  },
})
