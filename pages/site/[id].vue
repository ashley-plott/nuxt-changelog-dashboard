<!-- pages/site/[id].vue -->
<script setup lang="ts">
type TabKey = 'calendar' | 'changelog' | 'forms' | 'notes' | 'details'

interface PrimaryContact { name?: string|null; email?: string|null; phone?: string|null }
interface SiteDoc {
  id: string; name?: string|null; env: 'production'|'staging'|'dev'|'test';
  renewMonth: number; websiteUrl?: string|null; gitUrl?: string|null; primaryContact?: PrimaryContact|null
}
interface MaintItem {
  site: { id: string; name?: string; env: string }
  date: string
  kind?: 'maintenance' | 'report'
  labels?: { preRenewal?: boolean; reportDue?: boolean; midYear?: boolean }
}
interface ChangelogEntry { _id?: string; site?: any; run?: any; receivedAt?: string; summary?: any; changes?: any }
interface FormLog { _id?: string; site?: any; form?: any; entry?: any; fields?: Record<string,string>; run?: any }

const route = useRoute()
const id = route.params.id as string
const headers = process.server ? useRequestHeaders(['cookie']) : undefined

function firstOfMonthUTC(d = new Date()) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)) }
function formatMonth(d: Date) { return d.toLocaleString(undefined, { month: 'long', year: 'numeric' }) }
const start = firstOfMonthUTC(new Date())
const months = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1))
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
  return { start: d, end }
})
function inMonth(it: { dateObj: Date }, m: { start: Date; end: Date }) {
  const t = it.dateObj.getTime()
  return t >= m.start.getTime() && t < m.end.getTime()
}
const toISOOrUndefined = (s:string) => s ? new Date(s).toISOString() : undefined

// Site & maintenance
const { data, pending, error, refresh: refreshSite } = await useFetch<{ site: SiteDoc; items: MaintItem[] }>(
  `/api/scheduler/sites/${id}`, { headers, key: `site-${id}` }
)
const site  = computed(() => data.value?.site)
const items = computed(() => (data.value?.items || []).map((it:any) => ({ ...it, dateObj: new Date(it.date) })))

// Tabs
const tab = ref<TabKey>('calendar')

// Auth
const me = await $fetch<{ authenticated: boolean; user?: any }>('/api/auth/me', { headers }).catch(() => ({ authenticated: false }))
const authed = !!me?.authenticated
const my = authed ? me.user : null

// Changelog
const selectedEnv = ref<string>(''); watchEffect(() => { if (site.value && selectedEnv.value === '') selectedEnv.value = site.value.env || '' })
const clLimit = ref(20); const clPkg = ref(''); const clFrom = ref(''); const clTo = ref('')
const { data: clData, pending: clPending, refresh: clRefresh } = await useAsyncData<{ items: ChangelogEntry[] }>(
  `site-changelogs-${id}`,
  () => $fetch('/api/changelogs', { query: {
      site: id, env: selectedEnv.value || undefined, limit: clLimit.value, pkg: clPkg.value || undefined,
      from: toISOOrUndefined(clFrom.value), to: toISOOrUndefined(clTo.value)
    }, headers }),
  { watch: [selectedEnv, clLimit, clPkg, clFrom, clTo] }
)
function moreChangelogs(){ clLimit.value += 20 }

// Forms
const flLimit = ref(20); const flEmail = ref(''); const flFrom = ref(''); const flTo = ref('')
const { data: flData, pending: flPending, refresh: flRefresh } = await useAsyncData<{ items: FormLog[] }>(
  `site-formlogs-${id}`,
  () => $fetch('/api/form-logs', { query: {
      site: id, env: selectedEnv.value || undefined, limit: flLimit.value, email: flEmail.value || undefined,
      from: toISOOrUndefined(flFrom.value), to: toISOOrUndefined(flTo.value)
    }, headers }),
  { watch: [selectedEnv, flLimit, flEmail, flFrom, flTo] }
)
function moreForms(){ flLimit.value += 20 }

// Notes
const notes = ref<{ items:any[] } | null>(null)
async function loadNotes(){
  notes.value = await $fetch(`/api/sites/${id}/notes`, { query: { env: site.value?.env }, headers })
}
onMounted(() => { if (tab.value === 'notes' && !notes.value) loadNotes() })
watch(tab, t => { if (t === 'notes' && !notes.value) loadNotes() })
const noteForm = reactive({ title: '', body: '', pinned: false })
const noteSaving = ref(false)
async function addNote(){
  if (!authed) return
  noteSaving.value = true
  try {
    await $fetch(`/api/sites/${id}/notes`, { method: 'POST', body: { ...noteForm, env: site.value?.env }, headers })
    noteForm.title = ''; noteForm.body = ''; noteForm.pinned = false
    await loadNotes()
  } finally { noteSaving.value = false }
}
function canEditNote(n:any){ if (!authed) return false; return my.role==='admin'||my.role==='manager'||String(n.author?.id)===String(my.id) }
async function saveNote(n:any, patch:any){ await $fetch(`/api/sites/${id}/notes/${n._id}`, { method:'PATCH', body:patch, headers }); await loadNotes() }
async function delNote(n:any){ if (!confirm('Delete this note?')) return; await $fetch(`/api/sites/${id}/notes/${n._id}`, { method:'DELETE', headers }); await loadNotes() }

// Details (edit + rebuild)
const canManageSite = computed(() => authed && (my?.role==='admin'||my?.role==='manager'))
function normalizeUrl(u:string){ const s=(u||'').trim(); if(!s) return ''; try{ return new URL(s.startsWith('http')?s:`https://${s}`).toString() } catch { return s } }
const det = reactive({ name:'', env: 'production' as SiteDoc['env'], renewMonth:1, websiteUrl:'', gitUrl:'', contactName:'', contactEmail:'', contactPhone:'' })
watchEffect(() => {
  const s = site.value; if(!s) return
  det.name = s.name || ''; det.env = (s.env as any)||'production'; det.renewMonth = Number(s.renewMonth||1)
  det.websiteUrl = s.websiteUrl || (s as any).url || ''; det.gitUrl = s.gitUrl || ''
  det.contactName = s.primaryContact?.name || ''; det.contactEmail = s.primaryContact?.email || ''; det.contactPhone = s.primaryContact?.phone || ''
})
const detSaving = ref(false); const detMsg = ref<string|null>(null); const detErr = ref<string|null>(null)
async function saveDetails(){
  if(!canManageSite.value) return
  detSaving.value = true; detMsg.value = detErr.value = null
  try {
    await $fetch('/api/scheduler/sites', { method:'POST', body:{
      id, name: det.name, env: det.env, renewMonth: Number(det.renewMonth),
      websiteUrl: normalizeUrl(det.websiteUrl), gitUrl: normalizeUrl(det.gitUrl),
      primaryContact: { name: det.contactName?.trim()||null, email: det.contactEmail?.trim()||null, phone: det.contactPhone?.trim()||null }
    }, headers })
    selectedEnv.value = det.env
    await refreshSite(); detMsg.value = 'Saved.'
  } catch (e:any) { detErr.value = e?.data?.message || e?.message || 'Failed to save' }
  finally { detSaving.value = false }
}
const rb = reactive({ backfillMonths:12, forwardMonths:14 })
const rebuilding = ref(false); const rbMsg = ref<string|null>(null); const rbErr = ref<string|null>(null)
async function rebuildMaintenance(){
  if(!canManageSite.value) return
  if(!confirm(`This will rebuild maintenance for ${det.name} (${det.env}). Continue?`)) return
  rebuilding.value = true; rbMsg.value = rbErr.value = null
  try {
    const res:any = await $fetch('/api/scheduler/sites', { method:'POST', body:{
      id, name: det.name, env: det.env, renewMonth: Number(det.renewMonth),
      websiteUrl: normalizeUrl(det.websiteUrl), gitUrl: normalizeUrl(det.gitUrl),
      primaryContact: { name: det.contactName?.trim()||null, email: det.contactEmail?.trim()||null, phone: det.contactPhone?.trim()||null },
      rebuild:true, backfillMonths: Number(rb.backfillMonths), forwardMonths: Number(rb.forwardMonths)
    }, headers })
    await refreshSite()
    rbMsg.value = `Rebuilt from ${res?.scheduleWindow?.from} to ${res?.scheduleWindow?.to} (${res?.scheduleWindow?.count || 0} dates).`
  } catch (e:any) { rbErr.value = e?.data?.message || e?.message || 'Failed to rebuild' }
  finally { rebuilding.value = false }
}

// Favicon helpers
const siteInitial = computed(() => (site.value?.name || site.value?.id || id).slice(0,1).toUpperCase())
const siteHostname = computed(() => {
  const raw = site.value?.websiteUrl || (site.value as any)?.url || ''
  try { return raw ? new URL(raw).hostname : '' } catch { return '' }
})
const favPrimary  = computed(() => siteHostname.value ? `https://www.google.com/s2/favicons?sz=64&domain=${siteHostname.value}` : '')
const favFallback = computed(() => siteHostname.value ? `https://icons.duckduckgo.com/ip3/${siteHostname.value}.ico` : '')
const favTriedFallback = ref(false); const favHide = ref(false)
function onFavError(){ if(!favTriedFallback.value) favTriedFallback.value = true; else favHide.value = true }

defineExpose({ refreshSite })
</script>

<template>
  <div class="space-y-6 md:space-y-8 p-4 sm:p-6">
    <!-- Header -->
    <div class="rounded-2xl border bg-white p-5 shadow-sm">
      <div class="flex items-start gap-4">
        <div class="h-12 w-12 rounded-2xl border bg-gray-50 flex items-center justify-center overflow-hidden">
          <img
            v-if="siteHostname && !favHide"
            :src="favTriedFallback ? favFallback : favPrimary"
            @error="onFavError"
            :alt="site?.name || site?.id || 'Site'"
            class="h-6 w-6"
            decoding="async"
            loading="eager"
          />
          <span v-else class="text-sm font-semibold text-gray-600">{{ siteInitial }}</span>
        </div>
        <div class="min-w-0">
          <h1 class="text-2xl font-bold truncate">{{ site?.name || site?.id || id }}</h1>
          <p class="mt-1 text-xs text-gray-500 truncate">
            {{ site?.id || id }}
            <span v-if="site?.env"> • <span class="capitalize">{{ site.env }}</span></span>
            <span v-if="site?.websiteUrl"> • <a :href="site.websiteUrl" target="_blank" class="hover:underline">Website</a></span>
            <span v-if="site?.gitUrl"> • <a :href="site.gitUrl" target="_blank" class="hover:underline">Repo</a></span>
          </p>
        </div>
        <div class="ml-auto flex flex-wrap items-center gap-2">
          <span v-if="site" class="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs bg-gray-50">
            <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            Renew: {{ new Date(2000, (site.renewMonth || 1)-1, 1).toLocaleString(undefined, { month:'long' }) }}
          </span>
          <NuxtLink to="/dashboard" class="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">← Back</NuxtLink>
        </div>
      </div>

      <!-- Tabs -->
      <div class="mt-5">
        <div class="inline-flex rounded-xl border bg-gray-50 p-1">
          <button @click="tab='calendar'"  :class="['px-4 py-2 rounded-lg text-sm transition', tab==='calendar'  ? 'bg-white shadow-sm' : 'text-gray-600 hover:bg-white/60']">Calendar</button>
          <button @click="tab='changelog'" :class="['px-4 py-2 rounded-lg text-sm transition', tab==='changelog' ? 'bg-white shadow-sm' : 'text-gray-600 hover:bg-white/60']">Changelog</button>
          <button @click="tab='forms'"     :class="['px-4 py-2 rounded-lg text-sm transition', tab==='forms'     ? 'bg-white shadow-sm' : 'text-gray-600 hover:bg-white/60']">Forms</button>
          <button @click="tab='notes'"     :class="['px-4 py-2 rounded-lg text-sm transition', tab==='notes'     ? 'bg-white shadow-sm' : 'text-gray-600 hover:bg-white/60']">Notes</button>
          <button @click="tab='details'"   :class="['px-4 py-2 rounded-lg text-sm transition', tab==='details'   ? 'bg-white shadow-sm' : 'text-gray-600 hover:bg-white/60']">Details</button>
        </div>
      </div>
    </div>

    <!-- States -->
    <div v-if="pending" class="rounded-2xl border bg-white p-8 text-center text-sm text-gray-500 shadow-sm">Loading…</div>
    <div v-else-if="error" class="rounded-2xl border bg-white p-8 text-center text-sm text-red-600 shadow-sm">Failed to load site.</div>

    <!-- Calendar -->
    <div v-else v-show="tab==='calendar'" class="space-y-3">
      <h2 class="text-lg font-semibold">Maintenance calendar</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        <div v-for="m in months" :key="m.start.toISOString()" class="rounded-2xl border bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold">{{ formatMonth(m.start) }}</h3>
          </div>
          <div class="mt-4 space-y-2">
            <div
              v-for="ev in items.filter(it => inMonth(it, m))"
              :key="ev.date"
              class="rounded-xl border px-3 py-2 flex items-center justify-between hover:bg-gray-50"
            >
              <div>
                <div class="font-medium">{{ new Date(ev.date).toLocaleDateString() }}</div>
                <div class="text-xs text-gray-500">
                  {{ ev.kind === 'report' || ev.labels?.reportDue ? 'Report due' : 'Maintenance' }}
                </div>
              </div>
              <div class="flex gap-2">
                <span v-if="ev.labels?.reportDue"  class="px-2 py-0.5 rounded-full text-xs bg-violet-50 text-violet-700 border border-violet-100">Report</span>
                <span v-if="ev.labels?.preRenewal" class="px-2 py-0.5 rounded-full text-xs bg-amber-50  text-amber-800  border border-amber-100">Pre-renewal</span>
                <span v-if="ev.labels?.midYear"    class="px-2 py-0.5 rounded-full text-xs bg-blue-50   text-blue-800   border border-blue-100">Mid-year</span>
              </div>
            </div>
            <div v-if="!items.some(it => inMonth(it, m))" class="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-gray-500">No maintenance scheduled.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Changelog -->
    <div v-show="tab==='changelog'" class="space-y-3">
      <!-- (unchanged table & filters from your version) -->
      <!-- ... keep your existing changelog template ... -->
    </div>

    <!-- Forms -->
    <div v-show="tab==='forms'" class="space-y-3">
      <!-- (unchanged filters/table from your version) -->
      <!-- ... keep your existing forms template ... -->
    </div>

    <!-- Notes -->
    <div v-show="tab==='notes'" class="space-y-3">
      <!-- (unchanged notes UI from your version) -->
      <!-- ... keep your existing notes template ... -->
    </div>

    <!-- Details -->
    <div v-show="tab==='details'" class="space-y-3">
      <h2 class="text-lg font-semibold">Site details</h2>
      <div class="rounded-2xl border bg-white p-5 shadow-sm space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Site ID</label>
            <input :value="id" disabled class="w-full rounded-lg border bg-gray-50 px-3 py-2" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Name</label>
            <input v-model="det.name" class="w-full rounded-lg border px-3 py-2" :disabled="!canManageSite" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Environment</label>
            <select v-model="det.env" class="w-full rounded-lg border px-3 py-2" :disabled="!canManageSite">
              <option value="production">production</option>
              <option value="staging">staging</option>
              <option value="dev">dev</option>
              <option value="test">test</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Renew month (1–12)</label>
            <input v-model.number="det.renewMonth" type="number" min="1" max="12" class="w-full rounded-lg border px-3 py-2" :disabled="!canManageSite" />
            <p class="mt-1 text-xs text-gray-500">Pre-renewal (R−2), Reports due (R−1), Mid-year (pre+6).</p>
          </div>
        </div>

        <!-- URLs -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Website URL</label>
            <input v-model="det.websiteUrl" placeholder="https://example.com" class="w-full rounded-lg border px-3 py-2" :disabled="!canManageSite" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Git URL</label>
            <input v-model="det.gitUrl" placeholder="https://github.com/org/repo" class="w-full rounded-lg border px-3 py-2" :disabled="!canManageSite" />
          </div>
        </div>

        <!-- Primary contact -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Contact name</label>
            <input v-model="det.contactName" class="w-full rounded-lg border px-3 py-2" :disabled="!canManageSite" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Contact email</label>
            <input v-model="det.contactEmail" type="email" placeholder="name@example.com" class="w-full rounded-lg border px-3 py-2" :disabled="!canManageSite" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Contact phone</label>
            <input v-model="det.contactPhone" placeholder="+44 ..." class="w-full rounded-lg border px-3 py-2" :disabled="!canManageSite" />
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-wrap items-center gap-3">
          <button v-if="canManageSite" @click="saveDetails" :disabled="detSaving" class="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50">
            {{ detSaving ? 'Saving…' : 'Save details' }}
          </button>
          <p v-if="detMsg" class="text-sm text-emerald-700">{{ detMsg }}</p>
          <p v-if="detErr" class="text-sm text-red-600">{{ detErr }}</p>
          <p v-if="!canManageSite" class="text-sm text-gray-500">Sign in as a manager or admin to edit.</p>
        </div>

        <!-- Rebuild CTA -->
        <div class="rounded-xl border bg-gray-50 p-4">
          <div class="flex flex-wrap items-end gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Backfill months</label>
              <input v-model.number="rb.backfillMonths" type="number" min="0" max="60" class="w-28 rounded-lg border px-3 py-2" :disabled="!canManageSite || rebuilding" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Forward months</label>
              <input v-model.number="rb.forwardMonths" type="number" min="0" max="60" class="w-28 rounded-lg border px-3 py-2" :disabled="!canManageSite || rebuilding" />
            </div>
            <button
              v-if="canManageSite"
              @click="rebuildMaintenance"
              :disabled="rebuilding"
              class="ml-auto rounded-lg bg-rose-600 px-4 py-2 text-white hover:bg-rose-700 disabled:opacity-50"
              title="Deletes and regenerates Pre (R−2), Report (R−1), Mid (+6) entries">
              {{ rebuilding ? 'Rebuilding…' : 'Rebuild maintenance' }}
            </button>
          </div>
          <p class="mt-2 text-xs text-gray-600">
            Rebuild deletes existing entries for this site/env and recreates: Pre-renewal (R−2), Report due (R−1), and Mid-year (pre+6) across the selected window.
          </p>
          <p v-if="rbMsg" class="mt-2 text-sm text-emerald-700">{{ rbMsg }}</p>
          <p v-if="rbErr" class="mt-2 text-sm text-red-600">{{ rbErr }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
