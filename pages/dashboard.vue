<script setup lang="ts">
// SCRIPT LOGIC REMAINS THE SAME, AS REQUESTED
import { reactive, computed, ref } from 'vue'
import { useFetch } from '#imports'

type MaintStatus = 'To-Do' | 'In Progress' | 'Awaiting Form Conf' | 'Chased Via Email' | 'Chased Via Phone' | 'Completed'
interface OverviewMaintItem {
  site: { id: string; name?: string; env: 'production'|'staging'|'dev'|'test' }
  date: string; kind: 'maintenance'|'report'; status?: MaintStatus
  labels?: { preRenewal?: boolean; midYear?: boolean; reportDue?: boolean }
}

const { data, pending, error, refresh } = await useFetch('/api/scheduler/overview')

const tab = ref<'overview'|'months'|'sites'>('overview')
const q = ref(''); const sortBy = ref<'az'|'renew-asc'|'renew-desc'>('az')
const envFilter = ref<'all'|'production'|'staging'|'dev'|'test'>('all')

function ordinal(n: number) { const s=['th','st','nd','rd'], v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]) }
function formatRenew(d?: string|number|Date) {
  if (!d) return '—'
  const dt = new Date(d); return `${ordinal(dt.getDate())} ${dt.toLocaleString(undefined,{month:'long'})} ${dt.getFullYear()}`
}
function monthName(m?: number) { if (!m) return ''; return new Date(2000, (m||1)-1, 1).toLocaleString(undefined, { month: 'long' }) }

const sites = computed(() => (data.value?.sites || []) as any[])
const maintenance = computed<OverviewMaintItem[]>(() => (data.value?.maintenance || []) as OverviewMaintItem[])

const favState = reactive<Record<string, { triedFallback: boolean; hide: boolean }>>({})
function hostOf(s: any) {
  const raw = s?.websiteUrl || s?.domain || ''
  try { const u = new URL(raw.includes('://') ? raw : `https://${raw}`); return u.hostname }
  catch { return '' }
}
function favPrimary(host: string) { return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64` }
function favFallback(host: string) { return `https://icons.duckduckgo.com/ip3/${host}.ico` }
function onFavError(e: Event, id: string, host: string) {
  const img = e.target as HTMLImageElement
  const st = (favState[id] ||= { triedFallback: false, hide: false })
  if (!st.triedFallback && host) { st.triedFallback = true; img.src = favFallback(host) }
  else { st.hide = true }
}

const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  let list = sites.value.filter(s => {
    const matchesQ = !term || String(s.name||'').toLowerCase().includes(term) || String(s.id||'').toLowerCase().includes(term) || String(s.domain||'').toLowerCase().includes(term)
    const matchesEnv = envFilter.value === 'all' || String(s.env||'').toLowerCase() === envFilter.value
    return matchesQ && matchesEnv
  })
  if (sortBy.value === 'az') list = list.sort((a,b) => String(a.name||a.id).localeCompare(String(b.name||b.id)))
  else if (sortBy.value === 'renew-asc') list = list.sort((a,b) => new Date(a.nextMaintenance||0).getTime() - new Date(b.nextMaintenance||0).getTime())
  else list = list.sort((a,b) => new Date(b.nextMaintenance||0).getTime() - new Date(a.nextMaintenance||0).getTime())
  return list
})

const now = new Date(); const startMonthIdx = now.getUTCMonth(); const startYear = now.getUTCFullYear()
const idx = (m:number) => (Number(m||0)-1+12)%12
const preIdxOf = (m:number) => (idx(m)-2+12)%12
const reportIdxOf = (m:number) => (idx(m)-1+12)%12
const midIdxOf = (m:number) => (preIdxOf(m)+6)%12
type MonthOverview = {
  key: string; label: string; year: number; monthIdx: number;
  renewals: any[]; maintenance: Array<any & { preRenewal?: boolean; midYear?: boolean; status?: MaintStatus }>;
  reports: Array<any & { status?: MaintStatus }>;
}
const monthsOverview = computed<MonthOverview[]>(() => {
  const out: MonthOverview[] = []
  for (let i=0;i<12;i++) {
    const monthIdx = (startMonthIdx + i) % 12
    const year = startYear + Math.floor((startMonthIdx + i) / 12)
    const label = new Date(Date.UTC(year, monthIdx, 1)).toLocaleString(undefined, { month: 'long', year: 'numeric' })
    if (maintenance.value.length) {
      const inMonth = maintenance.value.filter(it => {
        const d = new Date(it.date); return d.getUTCFullYear() === year && d.getUTCMonth() === monthIdx && it.status !== 'Completed'
      })
      const maintList = inMonth.filter(it => it.kind === 'maintenance').map(it => ({ ...it.site, ...(it.labels||{}), status: it.status }))
      const reportList = inMonth.filter(it => it.kind === 'report').map(it => ({ ...it.site, status: it.status }))
      const renewals = (data.value?.sites || []).filter((s: any) => Number(s.renewMonth) === monthIdx + 1)
      out.push({ key: `${year}-${monthIdx}`, label, year, monthIdx, renewals, maintenance: maintList, reports: reportList })
      continue
    }
    const renewals = sites.value.filter(s => Number(s.renewMonth) === monthIdx + 1)
    const maintenanceFallback = sites.value.filter(s => preIdxOf(Number(s.renewMonth)) === monthIdx || midIdxOf(Number(s.renewMonth)) === monthIdx).map(s => ({ ...s, preRenewal: preIdxOf(Number(s.renewMonth)) === monthIdx, midYear: midIdxOf(Number(s.renewMonth)) === monthIdx }))
    const reportsFallback = sites.value.filter(s => reportIdxOf(Number(s.renewMonth)) === monthIdx)
    out.push({ key: `${year}-${monthIdx}`, label, year, monthIdx, renewals, maintenance: maintenanceFallback, reports: reportsFallback })
  }
  return out
})
const thisMonth = computed(() => monthsOverview.value[0])

const sendingMail = ref(false); const mailMsg = ref<string|null>(null); const mailErr = ref<string|null>(null)
async function sendMonthlySummary() {
  sendingMail.value = true; mailMsg.value = mailErr.value = null
  try {
    const res:any = await $fetch('/api/mail/summary', { method: 'POST' })
    mailMsg.value = `Sent. Reports: ${res?.counts?.reports ?? 0}, Maintenance: ${res?.counts?.maintenance ?? 0}`
  } catch (e:any) { mailErr.value = e?.data?.message || e?.message || 'Failed to send email' }
  finally { sendingMail.value = false }
}

type PingRes = { ok: boolean; finalUrl?: string; status?: number; statusText?: string; timeMs?: number; hasMaintainClass?: boolean; error?: string }
const testUrl = ref(''); const testing = ref(false); const testMsg = ref<string|null>(null); const testErr = ref<string|null>(null); const testRes = ref<PingRes|null>(null)
async function testPing () {
  testing.value = true; testMsg.value = testErr.value = null; testRes.value = null
  try {
    const res = await $fetch('/api/utils/ping', { method: 'POST', body: { url: testUrl.value, className: 'plott-maintain' } })
    testRes.value = res
    if (!res.ok) { testErr.value = res.error || res.statusText || 'Request failed' }
    else { testMsg.value = res.hasMaintainClass ? '✅ Contains .plott-maintain' : '⚠️ Does NOT contain .plott-maintain' }
  } catch (e:any) { testErr.value = e?.data?.message || e?.message || 'Failed' }
  finally { testing.value = false }
}

const statusClass = (s?: MaintStatus) => {
  const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium'
  switch (s) {
    case 'To-Do': return base + ' bg-amber-100 text-amber-800 border-amber-200/80'
    case 'In Progress': return base + ' bg-blue-100 text-blue-800 border-blue-200/80'
    case 'Completed': return base + ' bg-slate-100 text-slate-600 border-slate-200/80 line-through'
    default: return base + ' bg-slate-100 text-slate-700 border-slate-200/80'
  }
}
const envBadge = (env?: string) => {
  const base = 'px-1.5 py-0.5 rounded border text-[10px] font-medium capitalize'
  switch (env) {
    case 'production': return base + ' bg-emerald-100 text-emerald-800 border-emerald-200/80'
    case 'staging': return base + ' bg-amber-100 text-amber-800 border-amber-200/80'
    default: return base + ' bg-slate-100 text-slate-700 border-slate-200/80'
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
    <header class="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 bg-white/80 backdrop-blur-lg border-b border-slate-200/80">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-3 space-y-4">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Sites Dashboard</h1>
            <p class="text-sm text-slate-500 hidden md:block">Search, plan, and track site maintenance</p>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <button @click="refresh" class="btn-secondary" :disabled="pending">
              <svg class="h-5 w-5" :class="{'animate-spin': pending}" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M15.312 11.342a1.25 1.25 0 1 1-2.324-1.122A5.002 5.002 0 0 0 10 5a5 5 0 0 0-5 5H3.75a.75.75 0 0 0 0 1.5h1.25a6.5 6.5 0 1 1-1.423 4.23.75.75 0 1 0-1.298.75 8 8 0 1 0 1.95-9.282.75.75 0 0 0-1.062 1.063 6.479 6.479 0 0 1 9.423-1.854 1.25 1.25 0 0 1 1.006 2.464Z" clip-rule="evenodd" /></svg>
              <span class="hidden sm:inline">Refresh</span>
            </button>
            <button @click="sendMonthlySummary" class="btn-secondary hidden sm:inline-flex" :disabled="sendingMail">{{ sendingMail ? 'Sending…' : 'Email summary' }}</button>
            <NuxtLink to="/sites" class="btn-primary">Add Site</NuxtLink>
          </div>
        </div>
        <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <nav class="inline-flex rounded-lg bg-slate-100 p-1 ring-1 ring-slate-200/80">
            <button @click="tab='overview'" :class="['tab-btn', tab==='overview' ? 'tab-btn-active' : '']"><svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M2.5 4A1.5 1.5 0 0 0 1 5.5V6h18v-.5A1.5 1.5 0 0 0 17.5 4h-15Z" clip-rule="evenodd" /><path d="M1 7.5v8A1.5 1.5 0 0 0 2.5 17h15a1.5 1.5 0 0 0 1.5-1.5v-8H1Z" /></svg>Overview</button>
            <button @click="tab='months'"   :class="['tab-btn', tab==='months'   ? 'tab-btn-active' : '']"><svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5h10.5a.75.75 0 0 1 0 1.5H4.75a.75.75 0 0 1 0-1.5Z" clip-rule="evenodd" /></svg>Months</button>
            <button @click="tab='sites'"    :class="['tab-btn', tab==='sites'    ? 'tab-btn-active' : '']"><svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 0 0 0 2h6a1 1 0 1 0 0-2H7Z" /><path fill-rule="evenodd" d="M3 8a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm-1 5a1 1 0 1 0 0 2h14a1 1 0 1 0 0-2H2Z" clip-rule="evenodd" /></svg>Sites</button>
          </nav>
          <div class="min-h-[1.25rem]">
            <p v-if="mailMsg" class="text-xs text-emerald-700">{{ mailMsg }}</p>
            <p v-if="mailErr" class="text-xs text-red-600">{{ mailErr }}</p>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto space-y-6">
      <div v-if="error" class="card text-center text-red-600">Failed to load dashboard data.</div>
      <div v-if="pending" class="card text-center text-slate-500">Loading dashboard...</div>

      <template v-else>
        <div v-show="tab==='overview'" class="space-y-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="kpi-card"><div class="kpi-label">Maintenance this month</div><div class="kpi-value">{{ thisMonth?.maintenance.length || 0 }}</div></div>
            <div class="kpi-card"><div class="kpi-label">Reports due</div><div class="kpi-value">{{ thisMonth?.reports.length || 0 }}</div></div>
            <div class="kpi-card"><div class="kpi-label">Renewals this month</div><div class="kpi-value">{{ thisMonth?.renewals.length || 0 }}</div></div>
            <div class="kpi-card"><div class="kpi-label">Total sites</div><div class="kpi-value">{{ sites.length }}</div></div>
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div class="card space-y-3 lg:col-span-1"><h2 class="font-semibold text-slate-800">Maintenance this month</h2><NuxtLink v-for="s in thisMonth.maintenance" :key="s.id" :to="`/site/${s.id}`" class="overview-item"><div class="overview-item-main"><p class="font-medium text-slate-800 truncate">{{ s.name || s.id }}</p></div><div class="flex gap-2 text-xs"><span v-if="s.status" :class="statusClass(s.status)">{{ s.status }}</span><span v-else><span v-if="s.preRenewal" class="chip chip-amber">Pre-renewal</span><span v-if="s.midYear" class="chip chip-blue">Mid-year</span></span></div></NuxtLink><p v-if="!thisMonth.maintenance.length" class="text-sm text-slate-500">No maintenance scheduled.</p></div>
            <div class="card space-y-3 lg:col-span-1"><h2 class="font-semibold text-slate-800">Reports due this month</h2><NuxtLink v-for="s in thisMonth.reports" :key="s.id" :to="`/site/${s.id}`" class="overview-item"><div class="overview-item-main"><p class="font-medium text-slate-800 truncate">{{ s.name || s.id }}</p></div><span class="chip chip-violet">Report</span></NuxtLink><p v-if="!thisMonth.reports.length" class="text-sm text-slate-500">No reports due.</p></div>
            <div class="card space-y-3 lg:col-span-1"><h2 class="font-semibold text-slate-800">Renewals this month</h2><NuxtLink v-for="s in thisMonth.renewals" :key="s.id" :to="`/site/${s.id}`" class="overview-item"><div class="overview-item-main"><p class="font-medium text-slate-800 truncate">{{ s.name || s.id }}</p></div><span class="text-sm text-slate-600">{{ monthName(s.renewMonth) }}</span></NuxtLink><p v-if="!thisMonth.renewals.length" class="text-sm text-slate-500">No renewals this month.</p></div>
          </div>
        </div>
        <div v-show="tab==='months'" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div v-for="m in monthsOverview" :key="m.key" class="card"><h3 class="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-3 mb-3">{{ m.label }}</h3><div class="space-y-4 text-sm"><div class="space-y-1"><h4 class="font-semibold text-slate-600">Maintenance <span class="count-badge">{{ m.maintenance.length }}</span></h4><div v-if="m.maintenance.length" class="space-y-1"><NuxtLink v-for="s in m.maintenance" :key="s.id" :to="`/site/${s.id}`" class="month-item"><span class="truncate">{{ s.name || s.id }}</span><div class="flex gap-2 text-[11px]"><span v-if="s.status" :class="statusClass(s.status)">{{ s.status }}</span><span v-else class="flex gap-1"><span v-if="s.preRenewal" class="chip chip-amber !px-1.5 !py-0.5">Pre</span><span v-if="s.midYear" class="chip chip-blue !px-1.5 !py-0.5">Mid</span></span></div></NuxtLink></div><p v-else class="text-xs text-slate-500 px-1.5">None</p></div><hr class="border-slate-200/60" /><div class="space-y-1"><h4 class="font-semibold text-slate-600">Reports <span class="count-badge">{{ m.reports.length }}</span></h4><div v-if="m.reports.length" class="space-y-1"><NuxtLink v-for="s in m.reports" :key="s.id" :to="`/site/${s.id}`" class="month-item"><span class="truncate">{{ s.name || s.id }}</span><span class="chip chip-violet">Report</span></NuxtLink></div><p v-else class="text-xs text-slate-500 px-1.5">None</p></div><hr class="border-slate-200/60" /><div class="space-y-1"><h4 class="font-semibold text-slate-600">Renewals <span class="count-badge">{{ m.renewals.length }}</span></h4><div v-if="m.renewals.length" class="space-y-1"><NuxtLink v-for="s in m.renewals" :key="s.id" :to="`/site/${s.id}`" class="month-item"><span class="truncate">{{ s.name || s.id }}</span></NuxtLink></div><p v-else class="text-xs text-slate-500 px-1.5">None</p></div></div></div>
          </div>
        </div>
        <div v-show="tab==='sites'" class="space-y-6">
          <div class="card"><div class="grid grid-cols-1 md:grid-cols-6 gap-4"><div class="md:col-span-3"><label for="site-search" class="filter-label">Search Site</label><input id="site-search" v-model="q" type="search" placeholder="By name, ID, or domain..." class="filter-input" /></div><div class="md:col-span-2"><label for="site-sort" class="filter-label">Sort By</label><select id="site-sort" v-model="sortBy" class="filter-input"><option value="az">A–Z</option><option value="renew-asc">Next maintenance ↑</option><option value="renew-desc">Next maintenance ↓</option></select></div><div class="md:col-span-1"><label for="site-env" class="filter-label">Env</label><select id="site-env" v-model="envFilter" class="filter-input"><option value="all">All</option><option value="production">Prod</option><option value="staging">Stage</option></select></div></div></div>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div v-for="s in filtered" :key="s.id" class="card flex flex-col"><div class="flex items-center gap-4"><div class="h-12 w-12 rounded-xl bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0"><img v-if="hostOf(s) && !favState[s.id]?.hide" :src="favState[s.id]?.triedFallback ? favFallback(hostOf(s)) : favPrimary(hostOf(s))" @error="(e) => onFavError(e, s.id, hostOf(s))" :alt="s.name || s.id" class="h-7 w-7" /><span v-else class="text-lg font-bold text-slate-500">{{ (s.name || s.id || '?').slice(0,1).toUpperCase() }}</span></div><div class="min-w-0"><h3 class="font-semibold text-slate-800 leading-tight truncate">{{ s.name || s.id }}</h3><p class="text-sm text-slate-500 truncate">{{ s.id }}</p></div></div><hr class="border-slate-200/60 my-4" /><div class="space-y-1 text-sm"><div class="flex justify-between"><span class="text-slate-500">Environment</span><span class="font-medium text-slate-700" :class="envBadge(s.env)">{{ s.env }}</span></div><div class="flex justify-between"><span class="text-slate-500">Next Maintenance</span><span class="font-medium text-slate-700">{{ formatRenew(s.nextMaintenance) || '—' }}</span></div></div><div class="mt-4 pt-4 border-t border-slate-200/60 flex-1 flex items-end justify-between"><NuxtLink :to="`/site/${s.id}`" class="text-sm font-semibold text-slate-600 hover:text-slate-900">View Details →</NuxtLink></div></div>
          </div>
          <div v-if="!pending && filtered.length === 0" class="card text-center text-slate-500">No sites match your filters.</div>
        </div>
        <div class="card"><h2 class="font-semibold text-slate-800 mb-2">Maintenance Mode Ping Test</h2><div class="flex flex-col sm:flex-row items-center gap-2"><input v-model="testUrl" type="url" placeholder="https://example.com" class="filter-input flex-1 w-full" /><button @click="testPing" class="btn-primary w-full sm:w-auto" :disabled="testing || !testUrl">{{ testing ? 'Pinging…' : 'Test URL' }}</button></div><div class="mt-2 text-sm min-h-[1.25rem]"><p v-if="testMsg" class="text-emerald-700" v-html="testMsg"></p><p v-if="testErr" class="text-red-600">{{ testErr }}</p><div v-if="testRes" class="text-xs text-slate-500 mt-1 space-y-0.5"><p>Final URL: <code class="text-slate-700">{{ testRes.finalUrl || '—' }}</code></p><p>Status: <code class="text-slate-700">{{ testRes.status || '—' }} {{ testRes.statusText || '' }}</code></p><p>Time: <code class="text-slate-700">{{ testRes.timeMs }}ms</code></p></div></div></div>
      </template>
    </main>
  </div>
</template>

<style scoped>
.btn-secondary { @apply inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 bg-white shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-60; }
.btn-primary { @apply inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white bg-slate-800 shadow-sm ring-1 ring-slate-800 hover:bg-slate-700 transition-colors disabled:opacity-60; }
.tab-btn { @apply rounded-md px-3 sm:px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-white/80 hover:text-slate-900 transition-all duration-200 flex items-center gap-2; }
.tab-btn-active { @apply bg-white text-slate-900 shadow-sm; }
.card { @apply bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/80 p-5; }
.kpi-card { @apply bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/80 p-4 transition-shadow hover:shadow-md; }
.kpi-label { @apply text-sm text-slate-500; }
.kpi-value { @apply text-3xl font-bold text-slate-800 mt-1; }
.overview-item { @apply flex items-center justify-between gap-3 rounded-lg p-2 -mx-2 hover:bg-slate-100/80 transition-colors; }
.overview-item-main { @apply min-w-0 flex-1; }
.month-item { @apply flex items-center justify-between gap-2 rounded-md p-1.5 -mx-1.5 text-slate-700 hover:bg-slate-100/80 transition-colors; }
.filter-label { @apply block text-sm font-medium text-slate-600 mb-1; }
.filter-input { @apply w-full rounded-lg bg-white px-3 py-2 text-sm text-slate-800 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-500 transition; }
.count-badge { @apply inline-block text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full ring-1 ring-slate-200; }
.chip { @apply inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium; }
.chip-violet { @apply bg-violet-100 text-violet-800 border-violet-200/80; }
.chip-amber { @apply bg-amber-100 text-amber-800 border-amber-200/80; }
.chip-blue { @apply bg-blue-100 text-blue-800 border-blue-200/80; }
</style>