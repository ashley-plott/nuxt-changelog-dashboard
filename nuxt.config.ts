
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],
  nitro: {
    preset: 'vercel'
  },
  routeRules: {
    '/api/**': { runtime: 'nodejs' }
  },
  devtools: { enabled: false }
})
