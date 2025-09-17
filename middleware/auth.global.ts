// middleware/auth.global.ts
export default defineNuxtRouteMiddleware(async (to) => {
  // Allow the login page itself
  if (to.path.startsWith('/login')) return

  const headers = process.server ? useRequestHeaders(['cookie']) : undefined
  const me = await $fetch('/api/auth/me', { headers }).catch(() => ({ authenticated: false }))

  if (!me?.authenticated) {
    return navigateTo(`/login?next=${encodeURIComponent(to.fullPath)}`)
  }
})
