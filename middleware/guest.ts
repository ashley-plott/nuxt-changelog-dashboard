// middleware/guest.ts
export default defineNuxtRouteMiddleware(async () => {
  const headers = process.server ? useRequestHeaders(['cookie']) : undefined
  const me = await $fetch('/api/auth/me', { headers }).catch(() => ({ authenticated: false }))
  if (me?.authenticated) return navigateTo('/dashboard')
})
