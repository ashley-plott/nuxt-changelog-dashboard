
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],
  nitro: {
    // no special preset required; works on Node/Vercel/Netlify
  },
  devtools: { enabled: false }
})
