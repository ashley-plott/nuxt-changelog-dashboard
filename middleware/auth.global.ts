export default defineNuxtRouteMiddleware(async (to) => {
  // allow the login page itself
  if (to.path === '/login') return

  try {
    // SSR- & client-safe; includes cookies
    const { data } = await useFetch('/api/auth/me', { credentials: 'include' })
    if (!data.value?.authenticated) {
      return navigateTo('/login')
    }
  } catch {
    // On fetch failure, be safe and send to login
    return navigateTo('/login')
  }
})
