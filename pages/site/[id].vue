<!-- pages/site/[id].vue (sleek UI + refined calendar + keyboard shortcuts, no dark mode) -->
<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch, watchEffect } from 'vue'
import { useRoute, useRouter, useFetch, useAsyncData, useRequestHeaders } from '#imports'

definePageMeta({ middleware: 'auth' }) // protect page

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
const router = useRouter()
const id = route.params.id as string
const headers = process.server ? useRequestHeaders(['cookie']) : undefined

const deleting = ref(false)
const delErr = ref<string|null>(null)
const delMsg = ref<string|null>(null)

function firstOfMonthUTC(d = new Date()) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)) }
function formatMonth(d: Date) { return d.toLocaleString(undefined, { month: 'long', year: 'numeric' }) }

// Extra date formatting for nicer calendar rows
function formatDateLine(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}
function dayNum(d: Date) { return String(d.getDate()).padStart(2, '0') }
function dayWk(d: Date)  { return d.toLocaleString(undefined, { weekday: 'short' }) }

const start = firstOfMonthUTC(new Date())
const months = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1))
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
  return { start: d, end, key: `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}` }
})
function inMonth(it: { dateObj: Date }, m: { start: Date; end: Date }) {
  const t = it.dateObj.getTime()
  return t >= m.start.getTime() && t < m.end.getTime()
}
const toISOOrUndefined = (s:string) => s ? new Date(s).toISOString() : undefined

// --- Auth ---
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
  const base = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium shadow-sm'
  switch (s) {
    case 'In Progress':        return base + ' bg-sky-50 text-sky-800 border-sky-200'
    case 'Awaiting Form Conf': return base + ' bg-amber-50 text-amber-800 border-amber-200'
    case 'Chased Via Email':   return base + ' bg-violet-50 text-violet-800 border-violet-200'
    case 'Chased Via Phone':   return base + ' bg-purple-50 text-purple-800 border-purple-200'
    case 'Completed':          return base + ' bg-emerald-50 text-emerald-800 border-emerald-200 line-through'
    default:                   return base + ' bg-gray-50 text-gray-700 border-gray-200'
  }
}
async function setItemStatus(ev: MaintItem, next: MaintStatus) {
  if (!(my?.role === 'admin' || my?.role === 'manager')) return
  await $fetch('/api/scheduler/maintenance/status', {
    method: 'PATCH',
    body: { siteId: ev.site.id, env: ev.site.env, date: ev.date, status: next },
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

// Delete site
async function deleteSite() {
  if (!canManageSite.value) return
  if (!site.value) return
  const name = site.value.name || site.value.id || id
  if (!confirm(`Delete site "${name}" and all its maintenance?\nThis cannot be undone.`)) return

  deleting.value = true
  delErr.value = delMsg.value = null
  try {
    const res:any = await $fetch(`/api/scheduler/sites/${encodeURIComponent(id)}?cascade=true`, {
      method: 'DELETE',
      headers
    })
    delMsg.value = `Deleted. (maintenance removed: ${res?.deleted?.maintenance ?? 0})`
    router.push('/dashboard')
  } catch (e:any) {
    delErr.value = e?.data?.message || e?.message || 'Failed to delete site'
  } finally {
    deleting.value = false
  }
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

// Utilities
async function copyToClipboard(text: string){
  try { await navigator.clipboard.writeText(text) } catch {}
}

// Counts for tab badges
const counts = computed(() => ({
  calendar: items.value.length,
  changelog: (clData.value?.items?.length || 0),
  forms: (flData.value?.items?.length || 0),
  notes: (notes.value?.items?.length || 0)
}))

// ===== Keyboard shortcuts =====
const chord = reactive({ waiting: false, timer: 0 as any })
function startChord(){
  chord.waiting = true
  clearTimeout(chord.timer)
  chord.timer = setTimeout(() => { chord.waiting = false }, 800)
}
function handleKeydown(e: KeyboardEvent){
  // Ignore when typing in inputs/textareas/selects
  const t = e.target as HTMLElement
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return

  if (e.key.toLowerCase() === 'g') { startChord(); return }
  if (chord.waiting) {
    switch (e.key.toLowerCase()) {
      case 'c': tab.value = 'calendar'; break
      case 'l': tab.value = 'changelog'; break
      case 'f': tab.value = 'forms'; break
      case 'n': tab.value = 'notes'; break
      case 'd': tab.value = 'details'; break
    }
    chord.waiting = false
    e.preventDefault();
    return
  }
  // singles
  if (e.key === 'r') { refreshSite(); e.preventDefault(); }
  if (e.key === 'e') { tab.value = 'details'; e.preventDefault(); }
  if (e.key >= '1' && e.key <= '5') {
    const map: Record<string, TabKey> = { '1':'calendar','2':'changelog','3':'forms','4':'notes','5':'details' }
    tab.value = map[e.key]
    e.preventDefault()
  }
}

// inside <script setup> of pages/site/[id].vue
const latestCi = ref<any>(null)
const repoSlug = computed(() => {
  const url = displayGitUrl.value || ''
  if (!url) return ''
  try {
    // https://github.com/owner/repo(.git)
    return new URL(url).pathname.replace(/^\//, '').replace(/\.git$/, '')
  } catch {
    // git@github.com:owner/repo(.git)
    const m = url.match(/github\.com[:/](.+?)(?:\.git)?$/i)
    return m ? m[1] : ''
  }
})

watchEffect(async () => {
  if (!repoSlug.value) return
  latestCi.value = await $fetch('/api/ci/latest', {
    query: { repo: repoSlug.value, env: site.value?.env || 'production' }
  }).catch(() => null)
})

function ciBadgeClass(status?: string) {
  switch (status) {
    case 'success': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'failure': return 'bg-rose-50 text-rose-700 border-rose-200'
    case 'cancelled': return 'bg-gray-50 text-gray-600 border-gray-200'
    default: return 'bg-amber-50 text-amber-800 border-amber-200'
  }
}

watch([repoSlug, () => site.value?.env], async ([slug, env]) => {
  if (!slug) { latestCi.value = null; return }
  latestCi.value = await $fetch('/api/ci/latest', {
    query: { repo: slug, env: env || 'production' }
  }).catch(() => null)
}, { immediate: true })


onMounted(() => { window.addEventListener('keydown', handleKeydown) })
onBeforeUnmount(() => { window.removeEventListener('keydown', handleKeydown) })

defineExpose({ refreshSite })
</script>

<template>
  <div class="min-h-screen bg-neutral-50">
    <!-- Sticky Header -->
    <header class="sticky top-0 z-10 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div class="flex items-start gap-4">
          <div class="h-12 w-12 rounded-2xl border bg-white flex items-center justify-center overflow-hidden shadow-sm">
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
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="text-xl sm:text-2xl font-semibold tracking-tight truncate">{{ site?.name || site?.id || id }}</h1>
              <span v-if="site" class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs bg-gray-50">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                {{ site.env }}
              </span>
              <span v-if="site" class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs bg-gray-50">
                Renew: {{ new Date(2000, (site.renewMonth || 1)-1, 1).toLocaleString(undefined, { month:'long' }) }}
              </span>
            </div>
            <p class="mt-1 text-xs text-gray-600 truncate">
              <button class="underline decoration-dotted underline-offset-2 hover:text-gray-800" @click="copyToClipboard(site?.id||id)" title="Copy site ID">
                {{ site?.id || id }}
              </button>
              <span v-if="displayWebsiteUrl"> • <a :href="displayWebsiteUrl" target="_blank" class="hover:underline underline-offset-2">Website</a></span>
              <span v-if="displayGitUrl"> • <a :href="displayGitUrl" target="_blank" class="hover:underline underline-offset-2">Repo</a></span>
              <span v-if="displayContact?.name || displayContact?.email || displayContact?.phone">
                • Contact:
                <span v-if="displayContact?.name">{{ displayContact.name }}</span>
                <span v-if="displayContact?.email"> — <a :href="`mailto:${displayContact.email}`" class="hover:underline underline-offset-2">{{ displayContact.email }}</a></span>
                <span v-if="displayContact?.phone"> — <a :href="`tel:${displayContact.phone}`" class="hover:underline underline-offset-2">{{ displayContact.phone }}</a></span>
              </span>
            </p>
          </div>
          <div class="ml-auto flex flex-wrap items-center gap-2">
            <NuxtLink to="/dashboard" class="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10">← Back</NuxtLink>
            <a v-if="displayWebsiteUrl" :href="displayWebsiteUrl" target="_blank" class="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10">Open site</a>
            <a v-if="displayGitUrl" :href="displayGitUrl" target="_blank" class="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10">Open repo</a>
            <a v-if="latestCi?.run?.ci_url"
              :href="latestCi.run.ci_url"
              target="_blank"
              :class="['inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs', ciBadgeClass(latestCi.status)]">
              CI: {{ latestCi.status }}
            </a>
          </div>
        </div>

        <!-- Tabs -->
        <div class="mt-3">
          <div class="inline-flex rounded-2xl border bg-gray-50 p-1 shadow-sm">
            <button @click="tab='calendar'"  :class="['px-4 py-2 rounded-xl text-sm transition flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10', tab==='calendar'  ? 'bg-white shadow-sm ring-1 ring-gray-200' : 'text-gray-600 hover:bg-white/60']">Calendar <span class="text-[10px] rounded-full bg-white px-1.5 border">{{ counts.calendar }}</span></button>
            <button @click="tab='changelog'" :class="['px-4 py-2 rounded-xl text-sm transition flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10', tab==='changelog' ? 'bg-white shadow-sm ring-1 ring-gray-200' : 'text-gray-600 hover:bg-white/60']">Changelog <span class="text-[10px] rounded-full bg-white px-1.5 border">{{ counts.changelog }}</span></button>
            <button @click="tab='forms'"     :class="['px-4 py-2 rounded-xl text-sm transition flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10', tab==='forms'     ? 'bg-white shadow-sm ring-1 ring-gray-200' : 'text-gray-600 hover:bg-white/60']">Forms <span class="text-[10px] rounded-full bg-white px-1.5 border">{{ counts.forms }}</span></button>
            <button @click="tab='notes'"     :class="['px-4 py-2 rounded-xl text-sm transition flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10', tab==='notes'     ? 'bg-white shadow-sm ring-1 ring-gray-200' : 'text-gray-600 hover:bg-white/60']">Notes <span class="text-[10px] rounded-full bg-white px-1.5 border">{{ counts.notes }}</span></button>
            <button @click="tab='details'"   :class="['px-4 py-2 rounded-xl text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10', tab==='details'   ? 'bg-white shadow-sm ring-1 ring-gray-200' : 'text-gray-600 hover:bg-white/60']">Details</button>
          </div>
          <p class="text-[11px] text-gray-500 mt-1">Shortcuts: <kbd class="kbd">g</kbd> then <kbd class="kbd">c</kbd>/<kbd class="kbd">l</kbd>/<kbd class="kbd">f</kbd>/<kbd class="kbd">n</kbd>/<kbd class="kbd">d</kbd>. Also <kbd class="kbd">1–5</kbd>, <kbd class="kbd">r</kbd> to refresh, <kbd class="kbd">e</kbd> details.</p>
        </div>
      </div>
    </header>

    <!-- Content -->
    <div class="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 md:space-y-8">
      <!-- Loading / Error -->
      <div v-if="pending" class="rounded-2xl border bg-white p-6 shadow-sm">
        <div class="animate-pulse space-y-3">
          <div class="h-4 w-40 bg-gray-200 rounded"></div>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            <div v-for="i in 6" :key="i" class="h-40 rounded-2xl border bg-gray-50"></div>
          </div>
        </div>
      </div>
      <div v-else-if="error" class="rounded-2xl border bg-white p-8 text-center text-sm text-red-600 shadow-sm">Failed to load site.</div>

      <!-- Calendar -->
      <div v-else v-show="tab==='calendar'" class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold tracking-tight">Maintenance calendar</h2>
          <button @click="refreshSite" class="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10" title="Refresh (r)">Refresh</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <section v-for="m in months" :id="`month-${m.key}`" :key="m.key" class="rounded-2xl border bg-white p-5 shadow-sm hover:shadow transition-shadow">
            <div class="flex items-center justify-between">
              <h3 class="text-base font-semibold tracking-tight">{{ formatMonth(m.start) }}</h3>
              <span v-if="isRenewalMonthUTC(m.start)" class="rounded-full border px-2 py-0.5 text-xs bg-emerald-50 text-emerald-700">Renewal</span>
            </div>

            <ul class="mt-4 space-y-2">
              <li v-for="ev in items.filter(it => inMonth(it, m))" :key="ev.date" class="group grid grid-cols-[auto,1fr,auto] items-center gap-3 rounded-xl border px-4 py-4 hover:bg-gray-50 focus-within:ring-1 focus-within:ring-gray-200">
                <!-- Date tile -->
                <div class="h-12 w-12 rounded-lg border bg-white shadow-sm flex flex-col items-center justify-center">
                  <div class="text-sm font-semibold leading-none">{{ dayNum(new Date(ev.date)) }}</div>
                  <div class="text-[10px] text-gray-500 leading-none">{{ dayWk(new Date(ev.date)) }}</div>
                </div>
                <!-- Details -->
                <div class="min-w-0">
                  <div class="font-medium truncate">{{ ev.kind === 'report' || ev.labels?.reportDue ? 'Report due' : 'Maintenance' }}</div>
                  <div class="text-xs text-gray-500">{{ formatDateLine(new Date(ev.date)) }}</div>
                  <div class="mt-1 flex flex-wrap gap-1.5 text-xs col-span-2">
                    <span v-if="ev.labels?.reportDue"  class="chip chip-violet">Report</span>
                    <span v-if="ev.labels?.preRenewal" class="chip chip-amber">Pre-renewal</span>
                    <span v-if="ev.labels?.midYear"    class="chip chip-blue">Mid-year</span>
                  </div>
                </div>
                <!-- Status -->
                <div class="flex items-center gap-2 col-span-3">
                  <span :class="statusClass(ev.status)">{{ ev.status || 'To-Do' }}</span>
                  <select
                    v-if="canManageSite"
                    :value="ev.status || 'To-Do'"
                    @change="setItemStatus(ev, ($event.target as HTMLSelectElement).value as MaintStatus)"
                    class="rounded-md border px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                    title="Update status"
                  >
                    <option v-for="s in STATUS_LIST" :key="s" :value="s">{{ s }}</option>
                  </select>
                </div>
              </li>
            </ul>

            <div v-if="!items.some(it => inMonth(it, m))" class="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-gray-500">No maintenance scheduled.</div>
          </section>
        </div>
      </div>

      <!-- Changelog -->
      <div v-show="tab==='changelog'" class="space-y-3">
        <h2 class="text-lg font-semibold tracking-tight">Changelog</h2>
        <div class="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
          <!-- filters -->
          <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div class="md:col-span-1">
              <label class="label">Environment</label>
              <select v-model="selectedEnv" class="input">
                <option value="">All</option>
                <option :value="site?.env">{{ site?.env }}</option>
              </select>
            </div>
            <div class="md:col-span-1">
              <label class="label">Package</label>
              <input v-model="clPkg" placeholder="vendor/package" class="input" />
            </div>
            <div class="md:col-span-1">
              <label class="label">From</label>
              <input v-model="clFrom" type="datetime-local" class="input" />
            </div>
            <div class="md:col-span-1">
              <label class="label">To</label>
              <input v-model="clTo" type="datetime-local" class="input" />
            </div>
            <div class="md:col-span-1 flex items-end gap-2">
              <input v-model.number="clLimit" type="number" min="1" class="input w-24" />
              <button @click="clRefresh" class="btn-primary" :disabled="clPending">Refresh</button>
            </div>
          </div>

          <div v-if="clPending" class="text-sm text-gray-500">Loading changes…</div>
          <div v-else-if="(clData?.items || []).length === 0" class="empty">No changelog entries.</div>

          <div v-else class="space-y-4">
            <div v-for="(entry, idx) in clData?.items || []" :key="entry._id || entry.run?.timestamp || idx" class="card">
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
                  <span class="pill pill-blue">Updated: {{ entry.summary?.updated_count || 0 }}</span>
                  <span class="pill pill-emerald">Added: {{ entry.summary?.added_count || 0 }}</span>
                  <span class="pill pill-rose">Removed: {{ entry.summary?.removed_count || 0 }}</span>
                </div>
              </div>

              <div v-if="entry.summary?.has_changes" class="mt-3 overflow-hidden rounded-lg ring-1 ring-gray-200">
                <table class="min-w-full text-sm">
                  <thead class="bg-gray-50">
                    <tr class="text-left">
                      <th class="th">Package</th>
                      <th class="th">Old</th>
                      <th class="th">New</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y">
                    <tr v-for="p in entry.changes?.updated || []" :key="'u-'+p.name">
                      <td class="td font-medium">{{ p.name }}</td>
                      <td class="td"><code>{{ p.old }}</code></td>
                      <td class="td"><code>{{ p.new }}</code></td>
                    </tr>
                    <tr v-for="p in entry.changes?.added || []" :key="'a-'+p.name">
                      <td class="td font-medium text-emerald-700">{{ p.name }}</td>
                      <td class="td"><em>—</em></td>
                      <td class="td"><code>{{ p.new }}</code></td>
                    </tr>
                    <tr v-for="p in entry.changes?.removed || []" :key="'r-'+p.name">
                      <td class="td font-medium text-rose-700">{{ p.name }}</td>
                      <td class="td"><code>{{ p.old }}</code></td>
                      <td class="td"><em>—</em></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="mt-3 text-sm text-gray-500">No dependency changes.</div>

              <div class="mt-2">
                <a v-if="entry.run?.ci_url" :href="entry.run.ci_url" target="_blank" class="link">CI build</a>
              </div>
            </div>

            <div class="flex justify-center">
              <button @click="moreChangelogs" class="btn">Load more</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Forms -->
      <div v-show="tab==='forms'" class="space-y-3">
        <h2 class="text-lg font-semibold tracking-tight">Forms</h2>
        <div class="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label class="label">Environment</label>
              <select v-model="selectedEnv" class="input">
                <option value="">All</option>
                <option :value="site?.env">{{ site?.env }}</option>
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

              <p class="text-xs text-gray-500 mt-2">
                PHP {{ log.run?.php_version }} • WP {{ log.run?.wp_version }} • GF {{ log.run?.gf_version }}
              </p>
            </div>

            <div class="flex justify-center">
              <button @click="moreForms" class="btn">Load more</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Notes -->
      <div v-show="tab==='notes'" class="space-y-3">
        <h2 class="text-lg font-semibold tracking-tight">Notes</h2>
        <div v-if="authed" class="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
          <div class="grid grid-cols-1 md:grid-cols-6 gap-3">
            <input v-model="noteForm.title" placeholder="Title" class="input md:col-span-3" />
            <label class="inline-flex items-center gap-2 text-sm md:col-span-1 select-none">
              <input type="checkbox" v-model="noteForm.pinned" class="rounded border-gray-300 focus:ring-0"/> Pinned
            </label>
          </div>
          <textarea v-model="noteForm.body" rows="4" placeholder="Write a note…" class="input w-full"></textarea>
          <div class="flex gap-3">
            <button @click="addNote" :disabled="noteSaving" class="btn-primary">
              {{ noteSaving ? 'Saving…' : 'Add note' }}
            </button>
            <button @click="loadNotes" class="btn">Refresh</button>
          </div>
        </div>
        <div v-else class="rounded-2xl border bg-white p-5 text-sm text-gray-500 shadow-sm">
          Sign in to add and manage notes.
        </div>

        <div class="space-y-3">
          <div v-if="!notes?.items" class="flex justify-center">
            <button @click="loadNotes" class="btn">Load notes</button>
          </div>
          <div v-else-if="notes.items.length === 0" class="empty">
            No notes yet.
          </div>

          <div v-else v-for="n in notes.items" :key="n._id" class="card">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="font-semibold tracking-tight">{{ n.title || 'Untitled' }}</h3>
                  <span v-if="n.pinned" class="pill pill-amber">Pinned</span>
                </div>
                <p class="whitespace-pre-wrap text-sm mt-1">{{ n.body }}</p>
                <p class="text-xs text-gray-500 mt-2">
                  by {{ n.author?.name || n.author?.email }} • {{ new Date(n.updatedAt).toLocaleString() }}
                </p>
              </div>
              <div v-if="canEditNote(n)" class="shrink-0 flex gap-2">
                <button @click="saveNote(n, { pinned: !n.pinned })" class="link text-xs">{{ n.pinned ? 'Unpin' : 'Pin' }}</button>
                <button @click="delNote(n)" class="link text-xs text-rose-600">Delete</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Details -->
      <div v-show="tab==='details'" class="space-y-3">
        <h2 class="text-lg font-semibold tracking-tight">Site details</h2>
        <div class="rounded-2xl border bg-white p-5 shadow-sm space-y-6">
          <!-- Basic fields -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="label">Site ID</label>
              <div class="flex items-center gap-2">
                <input :value="id" disabled class="input bg-gray-50" />
                <button class="btn" @click="copyToClipboard(id)">Copy</button>
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

          <!-- URLs -->
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

          <!-- Primary contact -->
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

          <!-- Actions -->
          <div class="flex flex-wrap items-center gap-3">
            <button v-if="canManageSite" @click="saveDetails" :disabled="detSaving" class="btn-primary">
              {{ detSaving ? 'Saving…' : 'Save details' }}
            </button>

            <button
              v-if="canManageSite"
              @click="async () => { await deleteSite() }"
              :disabled="deleting"
              class="btn-danger"
              title="Permanently delete this site and its maintenance"
            >
              {{ deleting ? 'Deleting…' : 'Delete site' }}
            </button>

            <p v-if="detMsg" class="text-sm text-emerald-700">{{ detMsg }}</p>
            <p v-if="detErr" class="text-sm text-rose-600">{{ detErr }}</p>
            <p v-if="delMsg" class="text-sm text-emerald-700">{{ delMsg }}</p>
            <p v-if="delErr" class="text-sm text-rose-600">{{ delErr }}</p>
            <p v-if="!canManageSite" class="text-sm text-gray-500">Sign in as a manager or admin to edit.</p>
          </div>

          <!-- Rebuild CTA -->
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
              <button
                v-if="canManageSite"
                @click="rebuildMaintenance"
                :disabled="rebuilding"
                class="ml-auto btn-danger"
                title="Deletes and regenerates cadence + report entries"
              >
                {{ rebuilding ? 'Rebuilding…' : 'Rebuild maintenance' }}
              </button>
            </div>
            <p class="mt-2 text-xs text-gray-600">
              Rebuild deletes existing entries for this site/env and recreates: 2-month cadence anchored at Pre-renewal (R−2), Report (R−1), and marks Mid-year (pre+6).
            </p>
            <p v-if="rbMsg" class="mt-2 text-sm text-emerald-700">{{ rbMsg }}</p>
            <p v-if="rbErr" class="mt-2 text-sm text-rose-600">{{ rbErr }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Smooth transitions + refined controls */
* { transition: background-color .2s ease, color .2s ease, border-color .2s ease, box-shadow .2s ease; }

.label { @apply block text-xs font-medium text-gray-600 mb-1; }
.input { @apply w-full rounded-lg border px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10; }
.btn { @apply rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10; }
.btn-primary { @apply inline-flex items-center rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20; }
.btn-danger { @apply inline-flex items-center rounded-lg bg-rose-600 px-4 py-2 text-white hover:bg-rose-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300; }
.link { @apply text-blue-600 hover:underline underline-offset-2; }
.card { @apply rounded-xl border bg-white p-4 shadow-sm; }
.empty { @apply rounded-xl border border-dashed p-6 text-center text-sm text-gray-500 bg-white shadow-sm; }
.th { @apply py-2 pl-3 pr-4 font-medium text-gray-600; }
.td { @apply py-2 pl-3 pr-4; }
.pill { @apply inline-flex items-center rounded-full px-2 py-1 text-xs; }
.pill-blue { @apply bg-blue-50 text-blue-700 border border-blue-100; }
.pill-emerald { @apply bg-emerald-50 text-emerald-700 border border-emerald-100; }
.pill-rose { @apply bg-rose-50 text-rose-700 border border-rose-100; }
.pill-purple { @apply bg-purple-50 text-purple-700 border border-purple-100; }
.pill-amber { @apply bg-amber-50 text-amber-800 border border-amber-100; }

.chip { @apply px-2 py-0.5 rounded-full border; }
.chip-violet { @apply bg-violet-50 text-violet-700 border-violet-100; }
.chip-amber { @apply bg-amber-50 text-amber-800 border-amber-100; }
.chip-blue { @apply bg-blue-50 text-blue-800 border-blue-100; }

.kbd { @apply px-1.5 py-0.5 border rounded text-[11px] bg-white shadow-sm; }
</style>
