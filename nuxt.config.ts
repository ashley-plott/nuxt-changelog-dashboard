import { title } from "process";

// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],
  nitro: {
    preset: 'vercel',
    externals: {
      inline:['puppeteer-core', '@sparticuz/chromium'],
    }
  },
  routeRules: {
    '/api/**': { runtime: 'nodejs' }
  },
  app:{
    head: {
      title: 'PLOTT Maintenance'
    }
  },
   runtimeConfig: {
    POSTMARK_TOKEN: process.env.POSTMARK_TOKEN,
    POSTMARK_MESSAGE_STREAM: process.env.POSTMARK_MESSAGE_STREAM || 'outbound',
    MAIL_FROM: process.env.MAIL_FROM,
    MAIL_TO_DEFAULT: process.env.MAIL_TO_DEFAULT,
    ciWebhookToken: process.env.CI_WEBHOOK_TOKEN,
  },
  devtools: { enabled: true }
})
