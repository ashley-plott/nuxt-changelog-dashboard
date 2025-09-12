<!-- pages/site/[id].vue -->
<script setup lang="ts">
const route = useRoute()
const id = route.params.id as string
const { data, pending, error } = await useFetch(`/api/scheduler/sites/${id}`)

const site = computed(() => data.value?.site)
const items = computed(() => (data.value?.items || []).map((it:any) => ({
  ...it,
  dateObj: new Date(it.date)
})))

// Build the next 12 month blocks from the current month (UTC boundaries)
function firstOfMonthUTC(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
}
const start = firstOfMonthUTC(new Date())
const months = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1))
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
  return { start: d, end }
})

// Events per month
function inMonth(it: any, m: { start: Date; end: Date }) {
  const t = it.dateObj.getTime()
  return t >= m.start.getTime() && t < m.end.getTime()
}

function formatMonth(d: Date) {
  return d.toLocaleString(undefined, { month: 'long', year: 'numeric' })
}
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center gap-3">
      <NuxtLink to="/dashboard" class="text-sm text-blue-600 hover:underline">← Back to all sites</NuxtLink>
      <h1 class="text-2xl font-bold ml-2">
        {{ site?.name || site?.id || id }}
      </h1>
      <span v-if="site" class="ml-auto text-sm px-2 py-1 rounded-full bg-gray-100">
        {{ site.env }} • Renew: {{ new Date(2000, (site.renewMonth || 1) - 1, 1).toLocaleString(undefined, { month: 'long' }) }}
      </span>
    </div>

    <div v-if="pending">Loading…</div>
    <div v-else-if="error" class="text-red-600">Failed to load site.</div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div
        v-for="m in months"
        :key="m.start.toISOString()"
        class="rounded-2xl border p-5 shadow-sm bg-white"
      >
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">{{ formatMonth(m.start) }}</h2>
        </div>

        <div class="mt-4 space-y-2">
          <div
            v-for="ev in items.filter(it => inMonth(it, m))"
            :key="ev.date"
            class="flex items-center justify-between rounded-lg border px-3 py-2"
          >
            <div>
              <div class="font-medium">{{ new Date(ev.date).toLocaleDateString() }}</div>
              <div class="text-xs text-gray-500">Maintenance</div>
            </div>
            <div class="flex gap-2">
              <span v-if="ev.labels?.preRenewal" class="px-2 py-0.5 rounded text-xs bg-amber-50">Pre-renewal</span>
              <span v-if="ev.labels?.midYear" class="px-2 py-0.5 rounded text-xs bg-blue-50">Mid-year</span>
            </div>
          </div>

          <p v-if="!items.some(it => inMonth(it, m))" class="text-sm text-gray-500">
            No maintenance scheduled.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
