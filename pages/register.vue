
<script setup lang="ts">
definePageMeta({ layout: false })
const email = ref('')
const name = ref('')
const password = ref('')
const errorMsg = ref<string|null>(null)
const loading = ref(false)

async function submit() {
  loading.value = true
  errorMsg.value = null
  try {
    await $fetch('/api/auth/register', { method: 'POST', body: { email: email.value, name: name.value, password: password.value } })
    return navigateTo('/dashboard')
  } catch (e:any) {
    errorMsg.value = e?.data?.message || e?.message || 'Register failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-6 bg-gray-50">
    <div class="w-full max-w-sm rounded-2xl border bg-white p-6 shadow-sm">
      <h1 class="text-xl font-semibold mb-4">Create admin</h1>
      <p class="text-xs text-gray-600 mb-4">If any user already exists, only admins can create more.</p>
      <div class="space-y-3">
        <input v-model="email" type="email" placeholder="Email" class="border rounded px-3 py-2 w-full" />
        <input v-model="name" placeholder="Name" class="border rounded px-3 py-2 w-full" />
        <input v-model="password" type="password" placeholder="Password (min 8)" class="border rounded px-3 py-2 w-full" />
        <button @click="submit" :disabled="loading" class="w-full px-4 py-2 rounded bg-black text-white">
          {{ loading ? 'Creating…' : 'Create account' }}
        </button>
        <p v-if="errorMsg" class="text-red-600 text-sm">{{ errorMsg }}</p>
        <p class="text-xs text-gray-500">You will be signed in automatically.</p>
      </div>
    </div>
  </div>
</template>
