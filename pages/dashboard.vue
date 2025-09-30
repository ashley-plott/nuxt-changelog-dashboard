<!-- pages/dashboard.vue (polished layout) -->
<script setup lang="ts">
// Keep dashboard behind login
definePageMeta({ middleware: 'auth' })

// ===== Types =====

type MaintStatus =
  | 'To-Do'
  | 'In Progress'
  | 'Awaiting Form Conf'
  | 'Chased Via Email'
  | 'Chased Via Phone'
  | 'Completed'

interface OverviewMaintItem {
  site: { id: string; name?: string; env: 'production'|'staging'|'dev'|'test' }
  date: string
  kind: 'maintenance'|'report'
  status?: MaintStatus
  labels?: { preRenewal?: boolean; midYear?: boolean; reportDue?: boolean }
}

// ===== Data fetch =====

const { data, pending, error, refresh } = await useFetch('/api/scheduler/overview')

// ===== Tabs =====

const tab = ref<'overview'|'months'|'sites'>('overview')

// ===== Filters (Sites tab) =====

const q = ref('')
const sortBy = ref<'az'|'renew-asc'|'renew-desc'>('az')
const envFilter = ref<'all'|'production'|'staging'|'dev'|'test'>('all')

// ===== Formatting helpers =====

function ordinal(n: number) { const s=['th','st','nd','rd'], v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]) }
function formatRenew(d?: string|number|Date) {
  if (!d) return '—'
  const dt = new Date(d); return `${ordinal(dt.getDate())} ${dt.toLocaleString(undefined,{month:'long'})} ${dt.getFullYear()}`
}
function monthName(m?: number) { if (!m) return ''; return new Date(2000, (m||1)-1, 1).toLocaleString(undefined, { month: 'long' }) }

// ===== Server data =====

const sites = computed(() => (data.value?.sites || []) as any[])
const maintenance = computed<OverviewMaintItem[]>(
  () => (data.value?.maintenance || []) as OverviewMaintItem[]
)

// ===== Favicons (per-site) =====

const favState = reactive<Record<string, { triedFallback: boolean; hide: boolean }>>({})

function hostOf(s: any) {
  const raw = s?.websiteUrl || s?.domain || ''
  try {
    const u = new URL(raw.includes('://') ? raw : `https://${raw}`)
    return u.hostname
  } catch {
    return ''
  }
}

function favPrimary(host: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`
}

function favFallback(host: string) {
  return `https://icons.duckduckgo.com/ip3/${host}.ico`
}

function onFavError(e: Event, id: string, host: string) {
  const img = e.target as HTMLImageElement
  const st = (favState[id] ||= { triedFallback: false, hide: false })
  if (!st.triedFallback && host) {
    st.triedFallback = true
    img.src = favFallback(host)
  } else {
    st.hide = true
  }
}

// ===== Filtering & Sorting (Sites tab) =====

const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  let list = sites.value.filter(s => {
    const matchesQ = !term
      || String(s.name||'').toLowerCase().includes(term)
      || String(s.id||'').toLowerCase().includes(term)
      || String(s.domain||'').toLowerCase().includes(term)
    const matchesEnv = envFilter.value === 'all'
      || String(s.env||'').toLowerCase() === envFilter.value
    return matchesQ && matchesEnv
  })
  if (sortBy.value === 'az') {
    list = list.sort((a,b) => String(a.name||a.id).localeCompare(String(b.name||b.id)))
  } else if (sortBy.value === 'renew-asc') {
    list = list.sort((a,b) => new Date(a.nextMaintenance||0).getTime() - new Date(b.nextMaintenance||0).getTime())
  } else {
    list = list.sort((a,b) => new Date(b.nextMaintenance||0).getTime() - new Date(a.nextMaintenance||0).getTime())
  }
  return list
})

// ===== Months overview (12 months from now) =====

const now = new Date()
const startMonthIdx = now.getUTCMonth()
const startYear = now.getUTCFullYear()

// Fallback helpers when API doesn't include maintenance rows
const idx = (m:number) => (Number(m||0)-1+12)%12
const preIdxOf    = (m:number) => (idx(m)-2+12)%12
const reportIdxOf = (m:number) => (idx(m)-1+12)%12
const midIdxOf    = (m:number) => (preIdxOf(m)+6)%12

type MonthOverview = {
  key: string; label: string; year: number; monthIdx: number;
  renewals: any[];
  maintenance: Array<any & { preRenewal?: boolean; midYear?: boolean; status?: MaintStatus }>;
  reports: Array<any & { status?: MaintStatus }>;
}

const monthsOverview = computed<MonthOverview[]>(() => {
  const out: MonthOverview[] = []

  for (let i=0;i<12;i++) {
    const monthIdx = (startMonthIdx + i) % 12
    const year = startYear + Math.floor((startMonthIdx + i) / 12)
    const label = new Date(Date.UTC(year, monthIdx, 1)).toLocaleString(undefined, { month: 'long', year: 'numeric' })

    // If server provided real maintenance items, use them (and hide Completed)
    if (maintenance.value.length) {
      const inMonth = maintenance.value.filter(it => {
        const d = new Date(it.date)
        return d.getUTCFullYear() === year && d.getUTCMonth() === monthIdx && it.status !== 'Completed'
      })

      const maintList = inMonth
        .filter(it => it.kind === 'maintenance')
        .map(it => ({ ...it.site, ...(it.labels||{}), status: it.status }))

      const reportList = inMonth
        .filter(it => it.kind === 'report')
        .map(it => ({ ...it.site, status: it.status }))

      const renewals = (data.value?.sites || []).filter((s: any) => Number(s.renewMonth) === monthIdx + 1)

      out.push({ key: `${year}-${monthIdx}`, label, year, monthIdx, renewals, maintenance: maintList, reports: reportList })
      continue
    }

    // Fallback to static cadence math (no status available)
    const renewals = sites.value.filter(s => Number(s.renewMonth) === monthIdx + 1)
    const maintenanceFallback = sites.value
      .filter(s => preIdxOf(Number(s.renewMonth)) === monthIdx || midIdxOf(Number(s.renewMonth)) === monthIdx)
      .map(s => ({ ...s,
        preRenewal: preIdxOf(Number(s.renewMonth)) === monthIdx,
        midYear:    midIdxOf(Number(s.renewMonth)) === monthIdx
      }))

    const reportsFallback = sites.value.filter(s => reportIdxOf(Number(s.renewMonth)) === monthIdx)

    out.push({
      key: `${year}-${monthIdx}`, label, year, monthIdx,
      renewals,
      maintenance: maintenanceFallback,
      reports: reportsFallback
    })
  }
  return out
})

const thisMonth = computed(() => monthsOverview.value[0])

// ===== Email summary =====

const sendingMail = ref(false)
const mailMsg = ref<string|null>(null)
const mailErr = ref<string|null>(null)

async function sendMonthlySummary() {
  sendingMail.value = true
  mailMsg.value = mailErr.value = null
  try {
    const res:any = await $fetch('/api/mail/summary', { method: 'POST' })
    mailMsg.value = `Sent. Reports: ${res?.counts?.reports ?? 0}, Maintenance: ${res?.counts?.maintenance ?? 0}`
  } catch (e:any) {
    mailErr.value = e?.data?.message || e?.message || 'Failed to send email'
  } finally {
    sendingMail.value = false
  }
}

// ===== Ping Test =====

type PingRes = {
  ok: boolean
  finalUrl?: string
  status?: number
  statusText?: string
  timeMs?: number
  hasMaintainClass?: boolean
  error?: string
}

const testUrl = ref('')
const testing = ref(false)
const testMsg = ref<string|null>(null)
const testErr = ref<string|null>(null)
const testRes = ref<PingRes|null>(null)

async function testPing () {
  testing.value = true
  testMsg.value = testErr.value = null
  testRes.value = null
  try {
    const res = await $fetch('/api/utils/ping', {
      method: 'POST',
      body: { url: testUrl.value, className: 'plott-maintain' }
    })
    testRes.value = res
    if (!res.ok) {
      testErr.value = res.error || res.statusText || 'Request failed'
    } else {
      testMsg.value = res.hasMaintainClass
        ? '✅ <header> contains .plott-maintain'
        : '⚠️ <header> does NOT contain .plott-maintain'
    }
  } catch (e:any) {
    testErr.value = e?.data?.message || e?.message || 'Failed'
  } finally {
    testing.value = false
  }
}

// ===== Status styling helpers =====

const statusClass = (s?: MaintStatus) => {
  const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px]'
  switch (s) {
    case 'To-Do': return base + ' bg-amber-50 text-amber-800 border-amber-200'
    case 'In Progress': return base + ' bg-blue-50 text-blue-800 border-blue-200'
    case 'Awaiting Form Conf': return base + ' bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200'
    case 'Chased Via Email': return base + ' bg-emerald-50 text-emerald-800 border-emerald-200'
    case 'Chased Via Phone': return base + ' bg-cyan-50 text-cyan-800 border-cyan-200'
    case 'Completed': return base + ' bg-gray-100 text-gray-700 border-gray-200 line-through'
    default: return base + ' bg-gray-50 text-gray-700 border-gray-200'
  }
}

const envBadge = (env?: string) => {
  const base = 'px-1.5 py-0.5 rounded border text-[10px] capitalize'
  switch (env) {
    case 'production': return base + ' bg-emerald-50 text-emerald-800 border-emerald-200'
    case 'staging': return base + ' bg-amber-50 text-amber-800 border-amber-200'
    case 'dev': return base + ' bg-blue-50 text-blue-800 border-blue-200'
    case 'test': return base + ' bg-gray-50 text-gray-700 border-gray-200'
    default: return base + ' bg-gray-50 text-gray-700 border-gray-200'
  }
}

// ===== Expose helpers to template =====
// - hostOf(s), favState, favPrimary(host), favFallback(host), onFavError(e, id, host)
// - formatRenew, monthName
// - filtered, monthsOverview, thisMonth
// - statusClass, envBadge
// - sendMonthlySummary, refresh
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Sticky top bar -->
    <div class="sticky top-0 z-10 bg-gradient-to-b from-white/90 to-white/50 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b">
      <div class="max-w-7xl mx-auto px-1 py-3 flex items-center justify-between">
        <div>
          <h1 class="text-xl md:text-2xl font-bold tracking-tight">Sites</h1>
          <p class="text-xs md:text-sm text-gray-500">Search, plan, and track maintenance</p>
        </div>
        <div class="flex items-center gap-2">
          <button @click="refresh" class="px-3 md:px-4 py-2 rounded-lg bg-black text-white shadow-sm disabled:opacity-60" :disabled="pending">
            <span v-if="pending">Refreshing…</span><span v-else>Refresh</span>
          </button>
          <button @click="sendMonthlySummary" class="px-3 md:px-4 py-2 rounded-lg border bg-white shadow-sm disabled:opacity-60" :disabled="sendingMail">
            {{ sendingMail ? 'Sending…' : 'Email summary' }}
          </button>
          <NuxtLink to="/sites" class="px-3 md:px-4 py-2 rounded-lg bg-black text-white shadow-sm">Add Site</NuxtLink>
        </div>
      </div>
      <div class="max-w-7xl mx-auto px-1 pb-3">
        <!-- Tabs -->
        <div class="inline-flex rounded-xl border bg-gray-50 p-1">
          <button @click="tab='overview'" :class="['px-4 py-2 rounded-lg text-sm transition flex items-center gap-2', tab==='overview' ? 'bg-white shadow-sm' : 'text-gray-600 hover:bg-white/60']">
            <span class="i-heroicons-home-20-solid hidden sm:inline" aria-hidden="true"></span>Overview
          </button>
          <button @click="tab='months'"   :class="['px-4 py-2 rounded-lg text-sm transition flex items-center gap-2', tab==='months'   ? 'bg-white shadow-sm' : 'text-gray-600 hover:bg-white/60']">
            <span class="i-heroicons-calendar-days-20-solid hidden sm:inline" aria-hidden="true"></span>Months
          </button>
          <button @click="tab='sites'"    :class="['px-4 py-2 rounded-lg text-sm transition flex items-center gap-2', tab==='sites'    ? 'bg-white shadow-sm' : 'text-gray-600 hover:bg-white/60']">
            <span class="i-heroicons-server-stack-20-solid hidden sm:inline" aria-hidden="true"></span>Sites
          </button>
        </div>
        <!-- Mail state -->
        <div class="mt-2 flex items-center gap-3 min-h-[1.25rem]">
          <p v-if="mailMsg" class="text-xs text-emerald-700">{{ mailMsg }}</p>
          <p v-if="mailErr" class="text-xs text-red-600">{{ mailErr }}</p>
        </div>
      </div>
    </div>

    <!-- States -->
    <div v-if="error" class="text-red-600">Failed to load sites.</div>

    <template v-else>
      <!-- OVERVIEW -->
      <div v-show="tab==='overview'" class="max-w-7xl mx-auto space-y-6">
        <!-- KPI row -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="rounded-2xl border bg-white p-4 shadow-sm">
            <div class="text-xs text-gray-500">Maintenance this month</div>
            <div class="text-2xl font-semibold mt-1">{{ thisMonth?.maintenance.length || 0 }}</div>
          </div>
          <div class="rounded-2xl border bg-white p-4 shadow-sm">
            <div class="text-xs text-gray-500">Reports due</div>
            <div class="text-2xl font-semibold mt-1">{{ thisMonth?.reports.length || 0 }}</div>
          </div>
          <div class="rounded-2xl border bg-white p-4 shadow-sm">
            <div class="text-xs text-gray-500">Renewals this month</div>
            <div class="text-2xl font-semibold mt-1">{{ thisMonth?.renewals.length || 0 }}</div>
          </div>
          <div class="rounded-2xl border bg-white p-4 shadow-sm">
            <div class="text-xs text-gray-500">Total sites</div>
            <div class="text-2xl font-semibold mt-1">{{ sites.length }}</div>
          </div>
        </div>

        <!-- Two-column panels -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <!-- Maintenance this month -->
          <div class="rounded-2xl border bg-white p-5 shadow-sm lg:col-span-1">
            <div class="flex items-center justify-between">
              <h2 class="text-base font-semibold">Maintenance this month</h2>
              <span class="text-xs rounded-full bg-gray-100 px-2 py-1">{{ thisMonth.maintenance.length }}</span>
            </div>
            <div class="mt-3 space-y-2" v-if="thisMonth.maintenance.length">
              <NuxtLink
                v-for="s in thisMonth.maintenance"
                :key="s.id"
                :to="`/site/${s.id}`"
                class="flex items-center justify-between rounded-xl border px-3 py-2 hover:bg-gray-50"
              >
                <div class="min-w-0">
                  <div class="truncate font-medium">{{ s.name || s.id }}</div>
                  <div class="text-xs text-gray-500 truncate flex items-center gap-1">
                    <span class="capitalize" :class="envBadge(s.env)">{{ s.env }}</span>
                    <span class="text-gray-400">•</span>
                    <span class="truncate">{{ s.id }}</span>
                  </div>
                </div>
                <div class="flex gap-2 text-xs">
                  <span v-if="s.status" :class="statusClass(s.status)">{{ s.status }}</span>
                  <span v-else>
                    <span v-if="s.preRenewal" class="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-100">Pre-renewal</span>
                    <span v-if="s.midYear" class="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-100">Mid-year</span>
                  </span>
                </div>
              </NuxtLink>
            </div>
            <p v-else class="text-sm text-gray-500">No maintenance scheduled this month.</p>
          </div>

          <!-- Reports due this month -->
          <div class="rounded-2xl border bg-white p-5 shadow-sm lg:col-span-1">
            <div class="flex items-center justify-between">
              <h2 class="text-base font-semibold">Reports due this month</h2>
              <span class="text-xs rounded-full bg-gray-100 px-2 py-1">{{ thisMonth.reports.length }}</span>
            </div>
            <div class="mt-3 space-y-2" v-if="thisMonth.reports.length">
              <NuxtLink
                v-for="s in thisMonth.reports"
                :key="s.id"
                :to="`/site/${s.id}`"
                class="flex items-center justify-between rounded-xl border px-3 py-2 hover:bg-gray-50"
              >
                <div class="min-w-0">
                  <div class="truncate font-medium">{{ s.name || s.id }}</div>
                  <div class="text-xs text-gray-500 truncate flex items-center gap-1">
                    <span class="capitalize" :class="envBadge(s.env)">{{ s.env }}</span>
                    <span class="text-gray-400">•</span>
                    <span class="truncate">{{ s.id }}</span>
                  </div>
                </div>
                <span class="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100">Report</span>
              </NuxtLink>
            </div>
            <p v-else class="text-sm text-gray-500">No reports due this month.</p>
          </div>

          <!-- Renewals this month -->
          <div class="rounded-2xl border bg-white p-5 shadow-sm lg:col-span-1">
            <div class="flex items-center justify-between">
              <h2 class="text-base font-semibold">Renewals this month</h2>
              <span class="text-xs rounded-full bg-gray-100 px-2 py-1">{{ thisMonth.renewals.length }}</span>
            </div>
            <div class="mt-3 space-y-2" v-if="thisMonth.renewals.length">
              <NuxtLink v-for="s in thisMonth.renewals" :key="s.id" :to="`/site/${s.id}`" class="flex items-center justify-between rounded-xl border px-3 py-2 hover:bg-gray-50">
                <div class="min-w-0">
                  <div class="truncate font-medium">{{ s.name || s.id }}</div>
                  <div class="text-xs text-gray-500 truncate flex items-center gap-1">
                    <span class="capitalize" :class="envBadge(s.env)">{{ s.env }}</span>
                    <span class="text-gray-400">•</span>
                    <span class="truncate">{{ s.id }}</span>
                  </div>
                </div>
                <span class="text-xs text-gray-600">{{ monthName(s.renewMonth) }}</span>
              </NuxtLink>
            </div>
            <p v-else class="text-sm text-gray-500">No renewals this month.</p>
          </div>
        </div>
      </div>

      <!-- MONTHS -->
      <div v-show="tab==='months'" class="max-w-7xl mx-auto space-y-3">
        <h2 class="text-lg font-semibold">Month-by-month overview</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div v-for="m in monthsOverview" :key="m.key" class="rounded-2xl border bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <h3 class="text-base font-semibold">{{ m.label }}</h3>
              <div class="flex items-center gap-2 text-xs">
                <span class="rounded-full bg-gray-100 px-2 py-0.5">Maint: {{ m.maintenance.length }}</span>
                <span class="rounded-full bg-gray-100 px-2 py-0.5">Reports: {{ m.reports.length }}</span>
                <span class="rounded-full bg-gray-100 px-2 py-0.5">Renew: {{ m.renewals.length }}</span>
              </div>
            </div>

            <div class="mt-4 space-y-3">
              <div>
                <div class="text-xs font-medium text-gray-600 mb-1">Maintenance</div>
                <div v-if="m.maintenance.length" class="space-y-1">
                  <NuxtLink v-for="s in m.maintenance" :key="s.id" :to="`/site/${s.id}`" class="flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
                    <div class="truncate">{{ s.name || s.id }}</div>
                    <div class="flex gap-2 text-[11px]">
                      <span v-if="s.status" :class="statusClass(s.status)">{{ s.status }}</span>
                      <span v-else class="flex gap-1">
                        <span v-if="s.preRenewal" class="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-100">Pre</span>
                        <span v-if="s.midYear" class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-100">Mid</span>
                      </span>
                    </div>
                  </NuxtLink>
                </div>
                <div v-else class="text-xs text-gray-500">No maintenance.</div>
              </div>

              <div>
                <div class="text-xs font-medium text-gray-600 mb-1">Reports</div>
                <div v-if="m.reports.length" class="space-y-1">
                  <NuxtLink v-for="s in m.reports" :key="s.id" :to="`/site/${s.id}`" class="flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
                    <div class="truncate">{{ s.name || s.id }}</div>
                    <span class="text-[11px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-100">Report</span>
                  </NuxtLink>
                </div>
                <div v-else class="text-xs text-gray-500">No reports.</div>
              </div>

              <div>
                <div class="text-xs font-medium text-gray-600 mb-1">Renewals</div>
                <div v-if="m.renewals.length" class="space-y-1">
                  <NuxtLink v-for="s in m.renewals" :key="s.id" :to="`/site/${s.id}`" class="flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
                    <div class="truncate">{{ s.name || s.id }}</div>
                    <span class="text-[11px] text-gray-600">{{ monthName(s.renewMonth) }}</span>
                  </NuxtLink>
                </div>
                <div v-else class="text-xs text-gray-500">No renewals.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SITES -->
      <div v-show="tab==='sites'" class="max-w-7xl mx-auto space-y-4">
        <!-- Filters -->
        <div class="rounded-2xl border bg-white p-4 shadow-sm">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div class="lg:col-span-6">
              <div class="relative">
                <label class="block text-xs text-gray-500 mb-1">Search Client</label>
                <input v-model="q" type="search" placeholder="Search sites…" class="w-full border rounded-xl px-4 py-2.5 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-black/10" />
              </div>
            </div>
            <div class="lg:col-span-3">
              <label class="block text-xs text-gray-500 mb-1">Sort</label>
              <select v-model="sortBy" class="w-full border rounded-xl px-3 py-2.5 bg-white shadow-sm">
                <option value="az">A–Z</option>
                <option value="renew-asc">Next maintenance ↑</option>
                <option value="renew-desc">Next maintenance ↓</option>
              </select>
            </div>
            <div class="lg:col-span-3">
              <label class="block text-xs text-gray-500 mb-1">Env</label>
              <select v-model="envFilter" class="w-full border rounded-xl px-3 py-2.5 bg-white shadow-sm">
                <option value="all">All</option>
                <option value="production">prod</option>
                <option value="staging">stage</option>
                <option value="dev">dev</option>
                <option value="test">test</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Cards -->
        <div v-if="pending" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <div v-for="i in 6" :key="i" class="h-40 rounded-2xl border bg-white shadow-sm animate-pulse"></div>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <div
            v-for="s in filtered"
            :key="s.id"
            class="group block rounded-2xl border p-5 bg-white shadow-sm hover:shadow-md transition"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0">
                <div class="h-10 w-10 rounded-xl border bg-gray-50 flex items-center justify-center overflow-hidden">
                  <img
                    v-if="hostOf(s) && !favState[s.id]?.hide"
                    :src="favState[s.id]?.triedFallback ? favFallback(hostOf(s)) : favPrimary(hostOf(s))"
                    @error="(e) => onFavError(e, s.id, hostOf(s))"
                    :alt="s.name || s.id || 'Site'"
                    class="h-6 w-6"
                    decoding="async"
                    loading="eager"
                  />
                  <span v-else class="text-sm font-semibold text-gray-600">
                    {{ (s.name || s.id || '?').slice(0,1).toUpperCase() }}
                  </span>
                </div>

                <div class="min-w-0">
                  <h3 class="text-base font-semibold leading-tight truncate">{{ s.name || s.id }}</h3>
                  <div class="flex items-center gap-2 text-[11px] text-gray-500 truncate mt-0.5">
                    <span v-if="s.websiteUrl">
                      <a :href="s.websiteUrl" target="_blank" rel="noopener" class="hover:underline">Website</a>
                    </span>
                    <span v-if="s.gitUrl">
                      <span v-if="s.websiteUrl" class="opacity-50 mr-2">•</span>
                      <a :href="s.gitUrl" target="_blank" rel="noopener" class="hover:underline">Repo</a>
                    </span>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-gray-500 truncate">
                    <span class="truncate">{{ s.id }}</span>
                    <span class="h-1 w-1 rounded-full bg-gray-300"></span>
                    <span :class="envBadge(s.env)">{{ s.env }}</span>
                  </div>
                </div>
              </div>
              <div class="text-right shrink-0">
                <div class="text-xs text-gray-500">Next maintenance</div>
                <div class="text-sm font-medium">
                  <span v-if="s.nextMaintenance">{{ formatRenew(s.nextMaintenance) }}</span>
                  <span v-else class="text-gray-500">{{ monthName(s.renewMonth) }}</span>
                </div>
              </div>
            </div>

            <div class="mt-4 flex items-center justify-between text-xs text-gray-600">
              <NuxtLink :to="`/site/${s.id}`" class="inline-flex items-center gap-1 group-hover:text-gray-800">
                Open details →
              </NuxtLink>
              <span v-if="s.tags?.length" class="inline-flex gap-1">
                <span v-for="t in s.tags.slice(0,3)" :key="t" class="px-2 py-0.5 rounded-full bg-gray-100 border">{{ t }}</span>
              </span>
            </div>
          </div>
        </div>

        <div v-if="!pending && filtered.length === 0" class="rounded-2xl border bg-white p-8 text-center text-gray-600">
          No sites match your filters.
        </div>
      </div>

      <!-- Ping Test -->
      <div class="max-w-7xl mx-auto rounded-2xl border bg-white p-4 shadow-sm">
        <div class="flex items-center gap-2">
          <input
            v-model="testUrl"
            type="url"
            placeholder="https://example.com"
            class="flex-1 border rounded-lg px-3 py-2"
            autocomplete="off"
          />
          <button @click="testPing" class="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-60" :disabled="testing || !testUrl">
            {{ testing ? 'Pinging…' : 'Test ping' }}
          </button>
        </div>
        <div class="mt-2 text-sm">
          <p v-if="testMsg" class="text-emerald-700">{{ testMsg }}</p>
          <p v-if="testErr" class="text-red-600">{{ testErr }}</p>
          <div v-if="testRes" class="text-xs text-gray-600 mt-1">
            <div>Final URL: <code>{{ testRes.finalUrl || '—' }}</code></div>
            <div>Status: <code>{{ testRes.status || '—' }}</code> {{ testRes.statusText || '' }}</div>
            <div>Time: <code>{{ testRes.timeMs }}ms</code></div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* Icon utility classes if using UnoCSS/Icons; safe to ignore otherwise */
.i-heroicons-home-20-solid::before{content:''}
.i-heroicons-calendar-days-20-solid::before{content:''}
.i-heroicons-server-stack-20-solid::before{content:''}
</style>
