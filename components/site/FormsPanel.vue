<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useAsyncData } from '#imports'
import type { FormLog } from '~/composables/site'
import { toISOOrUndefined } from '~/composables/site'

const props = defineProps<{ siteId: string; env: string }>()
const headers = process.server ? useRequestHeaders(['cookie']) : undefined

const selectedEnv = ref<string>(''); watchEffect(() => { selectedEnv.value = props.env || '' })
const flLimit = ref(20); const flEmail = ref(''); const flFrom = ref(''); const flTo = ref('')
const { data: flData, pending: flPending, refresh: flRefresh } = await useAsyncData<{ items: FormLog[] }>(
  `site-formlogs-${props.siteId}`,
  () => $fetch('/api/form-logs', { query: {
      site: props.siteId, env: selectedEnv.value || undefined, limit: flLimit.value, email: flEmail.value || undefined,
      from: toISOOrUndefined(flFrom.value), to: toISOOrUndefined(flTo.value)
    }, headers }),
  { watch: [selectedEnv, flLimit, flEmail, flFrom, flTo] }
)
function moreForms(){ flLimit.value += 20 }
</script>

<template>
  <div class="space-y-3">
    <h2 class="text-lg font-semibold tracking-tight">Forms</h2>
    <div class="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <label class="label">Environment</label>
          <select v-model="selectedEnv" class="input">
            <option value="">All</option>
            <option :value="env">{{ env }}</option>
          </select>
        </div>
        <div>
          <label class="label">Email</label>
          <input v-model="flEmail" placeholder="name@plott.co.uk" class="input" />
        </div>
        <div>
          <label class="label">From</label>
          <input v-model="flFrom" type="datetime-local" class="input" />
        </div>
        <div>
          <label class="label">To</label>
          <input v-model="flTo" type="datetime-local" class="input" />
        </div>
        <div class="flex items-end gap-2">
          <input v-model.number="flLimit" type="number" min="1" class="input w-24" />
          <button @click="flRefresh" class="btn-primary" :disabled="flPending">Refresh</button>
        </div>
      </div>

      <div v-if="flPending" class="text-sm text-gray-500">Loading submissions…</div>
      <div v-else-if="(flData?.items || []).length === 0" class="empty">No form submissions.</div>

      <div v-else class="space-y-4">
        <div v-for="(log, i) in flData?.items || []" :key="log._id || i" class="card">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="font-medium">{{ new Date(log.entry?.created_at || (log as any).receivedAt).toLocaleString() }}</div>
              <div class="text-xs text-gray-500">{{ log.form?.title || 'Form' }} • {{ log.entry?.email }}</div>
            </div>
            <span class="pill pill-purple">GF submission</span>
          </div>

          <div class="mt-3 overflow-hidden rounded-lg ring-1 ring-gray-200">
            <table class="min-w-full text-sm">
              <thead class="bg-gray-50">
                <tr class="text-left">
                  <th class="th">Field</th>
                  <th class="th">Value</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                <tr v-for="(val, label) in (log.fields || {})" :key="label" class="align-top">
                  <td class="td font-medium">{{ label }}</td>
                  <td class="td break-all">{{ val }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p class="text-xs text-gray-500 mt-2">PHP {{ log.run?.php_version }} • WP {{ log.run?.wp_version }} • GF {{ log.run?.gf_version }}</p>
        </div>

        <div class="flex justify-center">
          <button @click="moreForms" class="btn">Load more</button>
        </div>
      </div>
    </div>
  </div>
</template>
