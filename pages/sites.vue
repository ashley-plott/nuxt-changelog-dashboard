
<script setup lang="ts">
const form = reactive({ id:'', name:'', env:'production', renewMonth:new Date().getMonth()+1, adminKey:'' })
const created = ref<any|null>(null)
const errorMsg = ref<string|null>(null)
const loading = ref(false)

async function submit() {
  loading.value = true
  errorMsg.value = null
  created.value = null
  try {
    const res = await $fetch('/api/scheduler/sites', {
      method: 'POST',
      headers: { 'x-admin-key': form.adminKey },
      body: { id: form.id.trim(), name: form.name.trim() || form.id.trim(), env: form.env, renewMonth: Number(form.renewMonth) }
    })
    created.value = res
  } catch (e:any) {
    errorMsg.value = e?.data?.message || e?.message || 'Failed'
  } finally {
    loading.value = false
  }
}
const schedule = ref<any[] | null>(null)
async function loadSchedule() {
  schedule.value = await $fetch('/api/scheduler/maintenance', { query: { site: form.id, env: form.env } })
}
</script>

<template>
  <div class="p-6 space-y-8 max-w-3xl">
    <h1 class="text-2xl font-bold">Sites &amp; Maintenance</h1>
    <div class="border rounded-xl p-5 space-y-4">
      <h2 class="text-lg font-semibold">Add Site</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium">Site ID (slug)</label><input v-model="form.id" class="border rounded px-3 py-2 w-full" placeholder="cc-london" /></div>
        <div><label class="block text-sm font-medium">Name</label><input v-model="form.name" class="border rounded px-3 py-2 w-full" placeholder="Clements & Church (London)" /></div>
        <div><label class="block text-sm font-medium">Environment</label>
          <select v-model="form.env" class="border rounded px-3 py-2 w-full">
            <option value="production">production</option><option value="staging">staging</option><option value="dev">dev</option><option value="test">test</option>
          </select>
        </div>
        <div><label class="block text-sm font-medium">Renew Month (1-12)</label><input v-model.number="form.renewMonth" type="number" min="1" max="12" class="border rounded px-3 py-2 w-full" />
          <p class="text-xs text-gray-500 mt-1">Pre‑renewal is one month before this.</p></div>
        <div class="md:col-span-2"><label class="block text-sm font-medium">Admin Key</label><input v-model="form.adminKey" class="border rounded px-3 py-2 w-full" placeholder="Enter NUXT_ADMIN_KEY" /></div>
      </div>
      <div class="flex gap-3 pt-2">
        <button @click="submit" :disabled="loading" class="px-4 py-2 rounded bg-black text-white">{{ loading ? 'Saving…' : 'Save & Generate Schedule' }}</button>
        <button @click="loadSchedule" class="px-4 py-2 rounded border">Load Schedule</button>
      </div>
      <p v-if="errorMsg" class="text-red-600 text-sm mt-2">{{ errorMsg }}</p>
      <div v-if="created" class="mt-4 text-sm"><p class="font-medium">Created/Updated:</p><pre class="bg-gray-50 p-3 rounded overflow-auto">{{ created }}</pre></div>
    </div>

    <div v-if="schedule?.items" class="border rounded-xl p-5">
      <h2 class="text-lg font-semibold mb-3">Schedule</h2>
      <table class="min-w-full text-sm">
        <thead><tr class="text-left border-b"><th class="py-2 pr-4">Date</th><th class="py-2 pr-4">Labels</th></tr></thead>
        <tbody>
          <tr v-for="it in schedule.items" :key="it.date" class="border-b last:border-0">
            <td class="py-2 pr-4"><code>{{ new Date(it.date).toLocaleDateString() }}</code></td>
            <td class="py-2 pr-4">
              <span v-if="it.labels?.preRenewal" class="px-2 py-1 rounded text-xs bg-amber-50">Pre‑renewal</span>
              <span v-if="it.labels?.midYear" class="ml-2 px-2 py-1 rounded text-xs bg-blue-50">Mid‑year</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
