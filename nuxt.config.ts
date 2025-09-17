import { title } from "process";

// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],
  nitro: {
    preset: 'vercel'
  },
  routeRules: {
    '/api/**': { runtime: 'nodejs' }
  },
  app:{
    head: {
      title: 'PLOTT Maintenance'
    }
  },
  devtools: { enabled: false }
})
