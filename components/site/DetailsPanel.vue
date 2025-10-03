<script setup lang="ts">
import { computed, reactive, ref, watchEffect } from 'vue'
import type { SiteDoc } from '~/composables/site'
import { normalizeUrl } from '~/composables/site'

const props = defineProps<{
  id: string
  site?: SiteDoc
  canManageSite: boolean
}>()
const headers = process.server ? useRequestHeaders(['cookie']) : undefined
const emit = defineEmits<{ (e:'saved'): void; (e:'deleted', redirectTo:string): void }>()

const det = reactive({ name:'', env: 'production' as SiteDoc['env'], renewMonth:1, websiteUrl:'', gitUrl:'', contactName:'', contactEmail:'', contactPhone:'' })
watchEffect(() => {
  const s = props.site; if(!s) return
  det.name = s.name || ''; det.env = (s.env as any)||'production'; det.renewMonth = Number(s.renewMonth||1)
  det.websiteUrl = (s.websiteUrl || (s as any).url || ''); det.gitUrl = s.gitUrl || ''
  det.contactName = s.primaryContact?.name || ''; det.contactEmail = s.primaryContact?.email || ''; det.contactPhone = s.primaryContact?.phone || ''
})
const detSaving = ref(false); const detMsg = ref<string|null>(null); const detErr = ref<string|null>(null)
async function saveDetails(){
  if(!props.canManageSite) return
  detSaving.value = true; detMsg.value = detErr.value = null
  try {
    await $fetch('/api/scheduler/sites', { method:'POST', body:{
      id: props.id, name: det.name, env: det.env, renewMonth: Number(det.renewMonth),
      websiteUrl: normalizeUrl(det.websiteUrl), gitUrl: normalizeUrl(det.gitUrl),
      primaryContact: { name: det.contactName?.trim()||null, email: det.contactEmail?.trim()||null, phone: det.contactPhone?.trim()||null }
    }, headers })
    detMsg.value = 'Saved.'; emit('saved')
  } catch (e:any) { detErr.value = e?.data?.message || e?.message || 'Failed to save' }
  finally { detSaving.value = false }
}

const rb = reactive({ backfillMonths:12, forwardMonths:14 })
const rebuilding = ref(false); const rbMsg = ref<string|null>(null); const rbErr = ref<string|null>(null)
async function rebuildMaintenance(){
  if(!props.canManageSite) return
  if(!confirm(`This will rebuild maintenance for ${det.name} (${det.env}). Continue?`)) return
  rebuilding.value = true; rbMsg.value = rbErr.value = null
  try {
    const res:any = await $fetch('/api/scheduler/sites', { method:'POST', body:{
      id: props.id, name: det.name, env: det.env, renewMonth: Number(det.renewMonth),
      websiteUrl: normalizeUrl(det.websiteUrl), gitUrl: normalizeUrl(det.gitUrl),
      primaryContact: { name: det.contactName?.trim()||null, email: det.contactEmail?.trim()||null, phone: det.contactPhone?.trim()||null },
      rebuild:true, backfillMonths: Number(rb.backfillMonths), forwardMonths: Number(rb.forwardMonths)
    }, headers })
    rbMsg.value = `Rebuilt from ${res?.scheduleWindow?.from} to ${res?.scheduleWindow?.to} (${res?.scheduleWindow?.count || 0} dates).`
    emit('saved')
  } catch (e:any) { rbErr.value = e?.data?.message || e?.message || 'Failed to rebuild' }
  finally { rebuilding.value = false }
}

const deleting = ref(false)
const delErr = ref<string|null>(null)
const delMsg = ref<string|null>(null)
async function deleteSite() {
  if (!props.canManageSite || !props.site) return
  const name = props.site.name || props.site.id || props.id
  if (!confirm(`Delete site "${name}" and all its maintenance?\nThis cannot be undone.`)) return
  deleting.value = true; delErr.value = delMsg.value = null
  try {
    const res:any = await $fetch(`/api/scheduler/sites/${encodeURIComponent(props.id)}?cascade=true`, { method: 'DELETE', headers })
    delMsg.value = `Deleted. (maintenance removed: ${res?.deleted?.maintenance ?? 0})`
    emit('deleted', '/dashboard')
  } catch (e:any) { delErr.value = e?.data?.message || e?.message || 'Failed to delete site' }
  finally { deleting.value = false }
}

const canManageText = computed(() => props.canManageSite ? '' : 'Sign in as a manager or admin to edit.')
</script>

<template>
  <div class="space-y-3">
    <h2 class="text-lg font-semibold tracking-tight">Site details</h2>
    <div class="rounded-2xl border bg-white p-5 shadow-sm space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="label">Site ID</label>
          <div class="flex items-center gap-2">
            <input :value="id" disabled class="input bg-gray-50" />
          </div>
        </div>
        <div>
          <label class="label">Name</label>
          <input v-model="det.name" class="input" :disabled="!canManageSite" />
        </div>
        <div>
          <label class="label">Environment</label>
          <select v-model="det.env" class="input" :disabled="!canManageSite">
            <option value="production">production</option>
            <option value="staging">staging</option>
            <option value="dev">dev</option>
            <option value="test">test</option>
          </select>
        </div>
        <div>
          <label class="label">Renew month (1–12)</label>
          <input v-model.number="det.renewMonth" type="number" min="1" max="12" class="input" :disabled="!canManageSite" />
          <p class="mt-1 text-xs text-gray-500">Pre-renewal (R−2), Reports due (R−1), Mid-year (pre+6).</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="label">Website URL</label>
          <input v-model="det.websiteUrl" placeholder="https://example.com" class="input" :disabled="!canManageSite" />
        </div>
        <div>
          <label class="label">Git URL</label>
          <input v-model="det.gitUrl" placeholder="https://github.com/org/repo" class="input" :disabled="!canManageSite" />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="label">Contact name</label>
          <input v-model="det.contactName" class="input" :disabled="!canManageSite" />
        </div>
        <div>
          <label class="label">Contact email</label>
          <input v-model="det.contactEmail" type="email" placeholder="name@example.com" class="input" :disabled="!canManageSite" />
        </div>
        <div>
          <label class="label">Contact phone</label>
          <input v-model="det.contactPhone" placeholder="+44 ..." class="input" :disabled="!canManageSite" />
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <button v-if="canManageSite" @click="saveDetails" :disabled="detSaving" class="btn-primary">{{ detSaving ? 'Saving…' : 'Save details' }}</button>
        <button v-if="canManageSite" @click="deleteSite" :disabled="deleting" class="btn-danger" title="Permanently delete this site and its maintenance">{{ deleting ? 'Deleting…' : 'Delete site' }}</button>
        <p v-if="detMsg" class="text-sm text-emerald-700">{{ detMsg }}</p>
        <p v-if="detErr" class="text-sm text-rose-600">{{ detErr }}</p>
        <p v-if="delMsg" class="text-sm text-emerald-700">{{ delMsg }}</p>
        <p v-if="delErr" class="text-sm text-rose-600">{{ delErr }}</p>
        <p v-if="!canManageSite" class="text-sm text-gray-500">{{ canManageText }}</p>
      </div>

      <div class="rounded-xl border bg-gray-50 p-4">
        <div class="flex flex-wrap items-end gap-3">
          <div>
            <label class="label">Backfill months</label>
            <input v-model.number="rb.backfillMonths" type="number" min="0" max="60" class="input w-28" :disabled="!canManageSite || rebuilding" />
          </div>
          <div>
            <label class="label">Forward months</label>
            <input v-model.number="rb.forwardMonths" type="number" min="0" max="60" class="input w-28" :disabled="!canManageSite || rebuilding" />
          </div>
          <button v-if="canManageSite" @click="rebuildMaintenance" :disabled="rebuilding" class="ml-auto btn-danger" title="Deletes and regenerates cadence + report entries">{{ rebuilding ? 'Rebuilding…' : 'Rebuild maintenance' }}</button>
        </div>
        <p class="mt-2 text-xs text-gray-600">Rebuild deletes existing entries for this site/env and recreates: 2-month cadence anchored at Pre-renewal (R−2), Report (R−1), and marks Mid-year (pre+6).</p>
        <p v-if="rbMsg" class="mt-2 text-sm text-emerald-700">{{ rbMsg }}</p>
        <p v-if="rbErr" class="mt-2 text-sm text-rose-600">{{ rbErr }}</p>
      </div>
    </div>
  </div>
</template>
