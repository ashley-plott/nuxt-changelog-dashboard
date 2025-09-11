<!-- pages/dashboard.vue -->
<script setup lang="ts">
const sites = await $fetch('/api/sites')
const siteOptions = computed(() => (sites?.sites || []).map((s:any)=>s.id))
const selectedSite = ref(siteOptions.value[0] || '')
const envOptions = computed(() => (sites?.sites || []).find((s:any)=>s.id===selectedSite.value)?.envs || [])
const selectedEnv = ref(envOptions.value[0] || 'production')
const limit = ref(25)

const { data, refresh, pending } = await useAsyncData(
  'changelogs',
  () => $fetch('/api/changelogs', { query: { site: selectedSite.value, env: selectedEnv.value, limit: limit.value } }),
  { watch: [selectedSite, selectedEnv, limit] }
)
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex flex-wrap items-end gap-4">
      <div>
        <label class="block text-sm font-medium">Site</label>
        <select v-model="selectedSite" class="border rounded px-3 py-2">
          <option v-for="id in siteOptions" :key="id" :value="id">{{ id }}</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium">Environment</label>
        <select v-model="selectedEnv" class="border rounded px-3 py-2">
          <option v-for="e in envOptions" :key="e" :value="e">{{ e }}</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium">Limit</label>
        <input v-model.number="limit" type="number" min="1" max="200" class="border rounded px-3 py-2 w-24" />
      </div>
      <button @click="refresh" class="ml-auto px-4 py-2 rounded bg-black text-white" :disabled="pending">Refresh</button>
    </div>

    <div v-if="pending">Loading…</div>

    <div v-else class="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div v-for="item in (data?.items || [])" :key="item.run?.timestamp" class="rounded-2xl border p-5 shadow-sm bg-white">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold">{{ item.site?.name || item.site?.id }}</h2>
            <p class="text-sm text-gray-500">
              {{ item.site?.env }} • {{ new Date(item.run?.timestamp).toLocaleString() }}
              <span v-if="item.run?.git_branch"> • {{ item.run.git_branch }}</span>
              <span v-if="item.run?.git_sha"> ({{ item.run.git_sha }})</span>
            </p>
          </div>
          <div class="flex gap-2">
            <span class="px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700">
              Updated: {{ item.summary?.updated_count || 0 }}
            </span>
            <span class="px-2 py-1 rounded-full text-xs bg-emerald-50 text-emerald-700">
              Added: {{ item.summary?.added_count || 0 }}
            </span>
            <span class="px-2 py-1 rounded-full text-xs bg-rose-50 text-rose-700">
              Removed: {{ item.summary?.removed_count || 0 }}
            </span>
          </div>
        </div>

        <div v-if="item.summary?.has_changes" class="mt-4 overflow-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="text-left border-b">
                <th class="py-2 pr-4">Package</th>
                <th class="py-2 pr-4">Old</th>
                <th class="py-2 pr-4">New</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in item.changes?.updated || []" :key="p.name" class="border-b last:border-0">
                <td class="py-2 pr-4 font-medium">{{ p.name }}</td>
                <td class="py-2 pr-4"><code>{{ p.old }}</code></td>
                <td class="py-2 pr-4"><code>{{ p.new }}</code></td>
              </tr>
              <tr v-for="p in item.changes?.added || []" :key="'a-'+p.name" class="border-b last:border-0">
                <td class="py-2 pr-4 font-medium text-emerald-700">{{ p.name }}</td>
                <td class="py-2 pr-4"><em>—</em></td>
                <td class="py-2 pr-4"><code>{{ p.new }}</code></td>
              </tr>
              <tr v-for="p in item.changes?.removed || []" :key="'r-'+p.name" class="border-b last:border-0">
                <td class="py-2 pr-4 font-medium text-rose-700">{{ p.name }}</td>
                <td class="py-2 pr-4"><code>{{ p.old }}</code></td>
                <td class="py-2 pr-4"><em>—</em></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="mt-4 text-sm text-gray-500">No dependency changes.</div>

        <div class="mt-3 flex gap-3">
          <a v-if="item.run?.ci_url" :href="item.run.ci_url" target="_blank" class="text-blue-600 hover:underline text-sm">CI build</a>
        </div>
      </div>
    </div>
  </div>
</template>
