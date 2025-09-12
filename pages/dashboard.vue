<!-- pages/dashboard.vue -->
<script setup lang="ts">
const { data, pending, error, refresh } = await useFetch('/api/scheduler/overview')

function monthName(m?: number) {
  if (!m) return ''
  return new Date(2000, m - 1, 1).toLocaleString(undefined, { month: 'long' })
}
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center gap-3 justify-between">
      <h1 class="text-2xl font-bold">Sites</h1>
      <div class="flex justify-center items-center gap-6">
      <button @click="refresh" class="ml-auto px-4 py-2 rounded bg-black text-white" :disabled="pending">Refresh</button>
      <NuxtLink to="/sites" class="ml-auto px-4 py-2 rounded bg-black text-white">Add Site</NuxtLink>
      </div>
    </div>

    <div v-if="pending">Loading…</div>
    <div v-else-if="error" class="text-red-600">Failed to load sites.</div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <NuxtLink
        v-for="s in data?.sites || []"
        :key="s.id"
        :to="`/site/${s.id}`"
        class="block rounded-2xl border p-5 shadow-sm bg-white transition hover:shadow-md"
      >
        <div class="flex items-start justify-between">
          <div>
            <h2 class="text-lg font-semibold">{{ s.name || s.id }}</h2>
            <p class="text-sm text-gray-500">{{ s.id }} • {{ s.env }}</p>
          </div>
          <span class="text-xs px-2 py-1 rounded-full bg-gray-100">
            Renew: {{ monthName(s.renewMonth) }}
          </span>
        </div>

        <div class="mt-4 text-sm">
          <p class="text-gray-500">Next maintenance</p>
          <p class="mt-1 font-medium">
            <span v-if="s.nextMaintenance">
              {{ new Date(s.nextMaintenance).toLocaleDateString() }}
              <span v-if="s.nextLabels?.preRenewal" class="ml-2 px-2 py-0.5 rounded text-xs bg-amber-50">Pre-renewal</span>
              <span v-if="s.nextLabels?.midYear" class="ml-2 px-2 py-0.5 rounded text-xs bg-blue-50">Mid-year</span>
            </span>
            <span v-else class="text-gray-500">No upcoming date</span>
          </p>
        </div>

        <div class="mt-4 flex gap-2 text-xs text-gray-500">
          <span>Open details →</span>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
