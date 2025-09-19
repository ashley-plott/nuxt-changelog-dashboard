<!-- pages/site/[id].vue -->
<script setup lang="ts">
definePageMeta({ middleware: 'auth' }) // protect page (see middleware below)

type TabKey = 'calendar' | 'changelog' | 'forms' | 'notes' | 'details'

type MaintStatus =
  | 'To-Do'
  | 'In Progress'
  | 'Awaiting Form Conf'
  | 'Chased Via Email'
  | 'Chased Via Phone'
  | 'Completed'

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
  status?: MaintStatus
}
interface ChangelogEntry {
  _id?: string
  site?: { id: string; env: string }
  run?: { timestamp?: string; git_branch?: string; git_sha?: string; ci_url?: string }
  receivedAt?: string
  summary?: { updated_count?: number; added_count?: number; removed_count?: number; has_changes?: boolean }
  changes?: {
    updated?: Array<{ name: string; old: string; new: string }>
    added?: Array<{ name: string; new: string }>
    removed?: Array<{ name: string; old: string }>
  }
}
interface FormLog {
  _id?: string
  site?: { id: string; env: string }
  form?: { id?: number; title?: string }
  entry?: { email?: string; created_at?: string }
  fields?: Record<string, string>
  run?: { php_version?: string; wp_version?: string; gf_version?: string }
}

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

// --- Auth (and optional hard redirect if not authed on client hydration) ---
const me = await $fetch<{ authenticated: boolean; user?: any }>('/api/auth/me', { headers }).catch(() => ({ authenticated: false }))
const authed = !!me?.authenticated
const my = authed ? me.user : null

// Site & maintenance
const { data, pending, error, refresh: refreshSite } = await useFetch<{ site: SiteDoc; items: MaintItem[] }>(
  `/api/scheduler/sites/${id}`, { headers, key: `site-${id}` }
)
const site  = computed(() => data.value?.site)
const items = computed(() => (data.value?.items || []).map((it:any) => ({ ...it, dateObj: new Date(it.date) })))

// Tabs
const tab = ref<TabKey>('calendar')

// ----- DISPLAY HELPERS -----
const displayWebsiteUrl = computed(() => {
  const s = site.value as any
  return (s?.websiteUrl || s?.url || '') as string
})
const displayGitUrl = computed(() => site.value?.gitUrl || '')
const displayContact = computed<PrimaryContact | null>(() => site.value?.primaryContact || null)

function isRenewalMonthUTC(monthStartUTC: Date) {
  const r = Number(site.value?.renewMonth || 0)
  if (!r) return false
  return monthStartUTC.getUTCMonth() === (r - 1)
}

// ----- Status helpers -----
const STATUS_LIST: MaintStatus[] = [
  'To-Do',
  'In Progress',
  'Awaiting Form Conf',
  'Chased Via Email',
  'Chased Via Phone',
  'Completed'
]
function statusClass(s?: MaintStatus) {
  switch (s) {
    case 'In Progress':        return 'bg-sky-50 text-sky-700 border border-sky-100'
    case 'Awaiting Form Conf': return 'bg-amber-50 text-amber-800 border border-amber-100'
    case 'Chased Via Email':   return 'bg-violet-50 text-violet-700 border border-violet-100'
    case 'Chased Via Phone':   return 'bg-purple-50 text-purple-700 border border-purple-100'
    case 'Completed':          return 'bg-emerald-50 text-emerald-700 border border-emerald-100'
    default:                   return 'bg-gray-50 text-gray-700 border border-gray-200' // To-Do / fallback
  }
}
async function setItemStatus(ev: MaintItem, next: MaintStatus) {
  if (!(my?.role === 'admin' || my?.role === 'manager')) return
  await $fetch('/api/scheduler/maintenance/status', {
    method: 'PATCH',
    body: {
      siteId: ev.site.id,
      env: ev.site.env,
      date: ev.date,
      status: next
    },
    headers
  })
  await refreshSite()
}

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
  det.websiteUrl = (s.websiteUrl || (s as any).url || ''); det.gitUrl = s.gitUrl || ''
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
  const raw = displayWebsiteUrl.value
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

          <!-- Links line (with robust fallbacks) -->
          <p class="mt-1 text-xs text-gray-500 truncate">
            {{ site?.id || id }}
            <span v-if="site?.env"> • <span class="capitalize">{{ site.env }}</span></span>
            <span v-if="displayWebsiteUrl"> • <a :href="displayWebsiteUrl" target="_blank" class="hover:underline">Website</a></span>
            <span v-if="displayGitUrl"> • <a :href="displayGitUrl" target="_blank" class="hover:underline">Repo</a></span>
          </p>

          <!-- Contact line -->
          <p
            v-if="displayContact?.name || displayContact?.email || displayContact?.phone"
            class="mt-1 text-xs text-gray-500 truncate"
          >
            Contact:
            <span v-if="displayContact?.name">{{ displayContact.name }}</span>
            <span v-if="displayContact?.email">
              • <a :href="`mailto:${displayContact.email}`" class="hover:underline">{{ displayContact.email }}</a>
            </span>
            <span v-if="displayContact?.phone">
              • <a :href="`tel:${displayContact.phone}`" class="hover:underline">{{ displayContact.phone }}</a>
            </span>
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

    <!-- Loading / Error -->
    <div v-if="pending" class="rounded-2xl border bg-white p-8 text-center text-sm text-gray-500 shadow-sm">Loading…</div>
    <div v-else-if="error" class="rounded-2xl border bg-white p-8 text-center text-sm text-red-600 shadow-sm">Failed to load site.</div>

    <!-- Calendar -->
    <div v-else v-show="tab==='calendar'" class="space-y-3">
      <h2 class="text-lg font-semibold">Maintenance calendar</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        <div v-for="m in months" :key="m.start.toISOString()" class="rounded-2xl border bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold">{{ formatMonth(m.start) }}</h3>
            <span v-if="isRenewalMonthUTC(m.start)" class="rounded-full border px-2 py-0.5 text-xs bg-emerald-50 text-emerald-700">Renewal</span>
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

              <div class="flex items-center gap-2">
                <!-- Status badge -->
                <span :class="['px-2 py-0.5 rounded-full text-xs', statusClass(ev.status)]">
                  {{ ev.status || 'To-Do' }}
                </span>

                <!-- Labels -->
                <span v-if="ev.labels?.reportDue"  class="px-2 py-0.5 rounded-full text-xs bg-violet-50 text-violet-700 border border-violet-100">Report</span>
                <span v-if="ev.labels?.preRenewal" class="px-2 py-0.5 rounded-full text-xs bg-amber-50  text-amber-800  border border-amber-100">Pre-renewal</span>
                <span v-if="ev.labels?.midYear"    class="px-2 py-0.5 rounded-full text-xs bg-blue-50   text-blue-800   border border-blue-100">Mid-year</span>

                <!-- Inline status editor (managers/admins only) -->
                <select
                  v-if="canManageSite"
                  :value="ev.status || 'To-Do'"
                  @change="setItemStatus(ev, ($event.target as HTMLSelectElement).value as MaintStatus)"
                  class="ml-2 rounded-md border px-2 py-1 text-xs"
                  title="Update status"
                >
                  <option v-for="s in STATUS_LIST" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>
            </div>

            <div v-if="!items.some(it => inMonth(it, m))" class="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-gray-500">
              No maintenance scheduled.
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Changelog -->
    <div v-show="tab==='changelog'" class="space-y-3">
      <h2 class="text-lg font-semibold">Changelog</h2>
      <div class="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
        <!-- filters -->
        <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div class="md:col-span-1">
            <label class="block text-xs font-medium text-gray-600 mb-1">Environment</label>
            <select v-model="selectedEnv" class="w-full rounded-lg border px-3 py-2">
              <option value="">All</option>
              <option :value="site?.env">{{ site?.env }}</option>
            </select>
          </div>
          <div class="md:col-span-1">
            <label class="block text-xs font-medium text-gray-600 mb-1">Package</label>
            <input v-model="clPkg" placeholder="vendor/package" class="w-full rounded-lg border px-3 py-2" />
          </div>
          <div class="md:col-span-1">
            <label class="block text-xs font-medium text-gray-600 mb-1">From</label>
            <input v-model="clFrom" type="datetime-local" class="w-full rounded-lg border px-3 py-2" />
          </div>
          <div class="md:col-span-1">
            <label class="block text-xs font-medium text-gray-600 mb-1">To</label>
            <input v-model="clTo" type="datetime-local" class="w-full rounded-lg border px-3 py-2" />
          </div>
          <div class="md:col-span-1 flex items-end gap-2">
            <input v-model.number="clLimit" type="number" min="1" class="w-24 rounded-lg border px-3 py-2" />
            <button @click="clRefresh" class="ml-auto inline-flex items-center rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50" :disabled="clPending">Refresh</button>
          </div>
        </div>

        <div v-if="clPending" class="text-sm text-gray-500">Loading changes…</div>
        <div v-else-if="(clData?.items || []).length === 0" class="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">No changelog entries.</div>

        <div v-else class="space-y-4">
          <div v-for="(entry, idx) in clData?.items || []" :key="entry._id || entry.run?.timestamp || idx" class="rounded-xl border p-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="font-medium">{{ new Date(entry.run?.timestamp || entry.receivedAt).toLocaleString() }}</div>
                <div class="text-xs text-gray-500">
                  {{ entry.site?.env }}
                  <span v-if="entry.run?.git_branch"> • {{ entry.run.git_branch }}</span>
                  <span v-if="entry.run?.git_sha"> ({{ entry.run.git_sha }})</span>
                </div>
              </div>
              <div class="flex flex-wrap gap-2">
                <span class="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">Updated: {{ entry.summary?.updated_count || 0 }}</span>
                <span class="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">Added: {{ entry.summary?.added_count || 0 }}</span>
                <span class="inline-flex items-center rounded-full bg-rose-50 px-2 py-1 text-xs text-rose-700">Removed: {{ entry.summary?.removed_count || 0 }}</span>
              </div>
            </div>

            <div v-if="entry.summary?.has_changes" class="mt-3 overflow-auto rounded-lg border">
              <table class="min-w-full text-sm">
                <thead class="bg-gray-50">
                  <tr class="text-left">
                    <th class="py-2 pl-3 pr-4 font-medium text-gray-600">Package</th>
                    <th class="py-2 pr-4 font-medium text-gray-600">Old</th>
                    <th class="py-2 pr-4 font-medium text-gray-600">New</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in entry.changes?.updated || []" :key="'u-'+p.name" class="border-t">
                    <td class="py-2 pl-3 pr-4 font-medium">{{ p.name }}</td>
                    <td class="py-2 pr-4"><code>{{ p.old }}</code></td>
                    <td class="py-2 pr-4"><code>{{ p.new }}</code></td>
                  </tr>
                  <tr v-for="p in entry.changes?.added || []" :key="'a-'+p.name" class="border-t">
                    <td class="py-2 pl-3 pr-4 font-medium text-emerald-700">{{ p.name }}</td>
                    <td class="py-2 pr-4"><em>—</em></td>
                    <td class="py-2 pr-4"><code>{{ p.new }}</code></td>
                  </tr>
                  <tr v-for="p in entry.changes?.removed || []" :key="'r-'+p.name" class="border-t">
                    <td class="py-2 pl-3 pr-4 font-medium text-rose-700">{{ p.name }}</td>
                    <td class="py-2 pr-4"><code>{{ p.old }}</code></td>
                    <td class="py-2 pr-4"><em>—</em></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="mt-3 text-sm text-gray-500">No dependency changes.</div>

            <div class="mt-2">
              <a v-if="entry.run?.ci_url" :href="entry.run.ci_url" target="_blank" class="text-blue-600 hover:underline text-sm">CI build</a>
            </div>
          </div>

          <div class="flex justify-center">
            <button @click="moreChangelogs" class="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Load more</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Forms -->
    <div v-show="tab==='forms'" class="space-y-3">
      <h2 class="text-lg font-semibold">Forms</h2>
      <div class="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Environment</label>
            <select v-model="selectedEnv" class="w-full rounded-lg border px-3 py-2">
              <option value="">All</option>
              <option :value="site?.env">{{ site?.env }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input v-model="flEmail" placeholder="name@plott.co.uk" class="w-full rounded-lg border px-3 py-2" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">From</label>
            <input v-model="flFrom" type="datetime-local" class="w-full rounded-lg border px-3 py-2" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">To</label>
            <input v-model="flTo" type="datetime-local" class="w-full rounded-lg border px-3 py-2" />
          </div>
          <div class="flex items-end gap-2">
            <input v-model.number="flLimit" type="number" min="1" class="w-24 rounded-lg border px-3 py-2" />
            <button @click="flRefresh" class="ml-auto inline-flex items-center rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50" :disabled="flPending">Refresh</button>
          </div>
        </div>

        <div v-if="flPending" class="text-sm text-gray-500">Loading submissions…</div>
        <div v-else-if="(flData?.items || []).length === 0" class="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">No form submissions.</div>

        <div v-else class="space-y-4">
          <div v-for="(log, i) in flData?.items || []" :key="log._id || i" class="rounded-xl border p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="font-medium">{{ new Date(log.entry?.created_at || log.receivedAt).toLocaleString() }}</div>
                <div class="text-xs text-gray-500">{{ log.form?.title || 'Form' }} • {{ log.entry?.email }}</div>
              </div>
              <span class="px-2 py-1 rounded-full text-xs bg-purple-50 text-purple-700">GF submission</span>
            </div>

            <div class="mt-3 overflow-auto rounded-lg border">
              <table class="min-w-full text-sm">
                <thead class="bg-gray-50">
                  <tr class="text-left">
                    <th class="py-2 pl-3 pr-4 font-medium text-gray-600">Field</th>
                    <th class="py-2 pr-4 font-medium text-gray-600">Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(val, label) in (log.fields || {})" :key="label" class="border-t align-top">
                    <td class="py-2 pl-3 pr-4 font-medium">{{ label }}</td>
                    <td class="py-2 pr-4 break-all">{{ val }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p class="text-xs text-gray-500 mt-2">
              PHP {{ log.run?.php_version }} • WP {{ log.run?.wp_version }} • GF {{ log.run?.gf_version }}
            </p>
          </div>

          <div class="flex justify-center">
            <button @click="moreForms" class="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Load more</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Notes -->
    <div v-show="tab==='notes'" class="space-y-3">
      <h2 class="text-lg font-semibold">Notes</h2>
      <div v-if="authed" class="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
        <div class="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input v-model="noteForm.title" placeholder="Title" class="border rounded-lg px-3 py-2 md:col-span-3" />
          <label class="inline-flex items-center gap-2 text-sm md:col-span-1">
            <input type="checkbox" v-model="noteForm.pinned" /> Pinned
          </label>
        </div>
        <textarea v-model="noteForm.body" rows="4" placeholder="Write a note…" class="border rounded-lg px-3 py-2 w-full"></textarea>
        <div class="flex gap-3">
          <button @click="addNote" :disabled="noteSaving" class="rounded-lg bg-black px-4 py-2 text-white">
            {{ noteSaving ? 'Saving…' : 'Add note' }}
          </button>
          <button @click="loadNotes" class="rounded-lg border px-4 py-2 hover:bg-gray-50">Refresh</button>
        </div>
      </div>
      <div v-else class="rounded-2xl border bg-white p-5 text-sm text-gray-500 shadow-sm">
        Sign in to add and manage notes.
      </div>

      <div class="space-y-3">
        <div v-if="!notes?.items" class="flex justify-center">
          <button @click="loadNotes" class="rounded-lg border px-4 py-2 hover:bg-gray-50">Load notes</button>
        </div>
        <div v-else-if="notes.items.length === 0" class="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500 bg-white shadow-sm">
          No notes yet.
        </div>

        <div v-else v-for="n in notes.items" :key="n._id" class="rounded-xl border bg-white p-4 shadow-sm">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-semibold">{{ n.title || 'Untitled' }}</h3>
                <span v-if="n.pinned" class="px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-800 border border-amber-100">Pinned</span>
              </div>
              <p class="whitespace-pre-wrap text-sm mt-1">{{ n.body }}</p>
              <p class="text-xs text-gray-500 mt-2">
                by {{ n.author?.name || n.author?.email }} • {{ new Date(n.updatedAt).toLocaleString() }}
              </p>
            </div>
            <div v-if="canEditNote(n)" class="shrink-0 flex gap-2">
              <button @click="saveNote(n, { pinned: !n.pinned })" class="text-xs underline">{{ n.pinned ? 'Unpin' : 'Pin' }}</button>
              <button @click="delNote(n)" class="text-xs text-red-600 underline">Delete</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Details -->
    <div v-show="tab==='details'" class="space-y-3">
      <h2 class="text-lg font-semibold">Site details</h2>
      <div class="rounded-2xl border bg-white p-5 shadow-sm space-y-6">
        <!-- Basic fields -->
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
              title="Deletes and regenerates cadence + report entries"
            >
              {{ rebuilding ? 'Rebuilding…' : 'Rebuild maintenance' }}
            </button>
          </div>
          <p class="mt-2 text-xs text-gray-600">
            Rebuild deletes existing entries for this site/env and recreates: 2-month cadence anchored at Pre-renewal (R−2), Report (R−1), and marks Mid-year (pre+6).
          </p>
          <p v-if="rbMsg" class="mt-2 text-sm text-emerald-700">{{ rbMsg }}</p>
          <p v-if="rbErr" class="mt-2 text-sm text-red-600">{{ rbErr }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
