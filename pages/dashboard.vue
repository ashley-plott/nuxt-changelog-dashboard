<!-- pages/dashboard.vue -->
<script setup lang="ts">
const { data, pending, error, refresh } = await useFetch('/api/scheduler/overview')

// Tabs
const tab = ref<'overview'|'months'|'sites'>('overview')

// Filters (Sites tab)
const q = ref('')
const sortBy = ref<'az'|'renew-asc'|'renew-desc'>('az')
const envFilter = ref<'all'|'production'|'staging'|'dev'|'test'>('all')

function ordinal(n: number) { const s=['th','st','nd','rd'], v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]) }
function formatRenew(d?: string|number|Date) {
  if (!d) return '—'
  const dt = new Date(d); return `${ordinal(dt.getDate())} ${dt.toLocaleString(undefined,{month:'long'})} ${dt.getFullYear()}`
}
function monthName(m?: number) { if (!m) return ''; return new Date(2000, (m||1)-1, 1).toLocaleString(undefined, { month: 'long' }) }

const sites = computed(() => (data.value?.sites || []) as any[])

// Sites tab filtering/sort
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

// Month-by-month (12 months from now), with reports
const now = new Date()
const startMonthIdx = now.getUTCMonth()
const startYear = now.getUTCFullYear()
const idx = (m:number) => (Number(m||0)-1+12)%12
const preIdxOf    = (m:number) => (idx(m)-2+12)%12
const reportIdxOf = (m:number) => (idx(m)-1+12)%12
const midIdxOf    = (m:number) => (preIdxOf(m)+6)%12

type MonthOverview = {
  key: string; label: string; year: number; monthIdx: number;
  renewals: any[]; maintenance: Array<any & { preRenewal?: boolean; midYear?: boolean }>; reports: any[]
}

const monthsOverview = computed<MonthOverview[]>(() => {
  const out: MonthOverview[] = []
  const list = sites.value
  for (let i=0;i<12;i++) {
    const monthIdx = (startMonthIdx + i) % 12
    const year = startYear + Math.floor((startMonthIdx + i) / 12)
    const label = new Date(Date.UTC(year, monthIdx, 1)).toLocaleString(undefined, { month: 'long', year: 'numeric' })

    const renewals = list.filter(s => Number(s.renewMonth) === monthIdx + 1)
    const maintenance = list
      .filter(s => preIdxOf(Number(s.renewMonth)) === monthIdx || midIdxOf(Number(s.renewMonth)) === monthIdx)
      .map(s => ({ ...s,
        preRenewal: preIdxOf(Number(s.renewMonth)) === monthIdx,
        midYear:    midIdxOf(Number(s.renewMonth)) === monthIdx
      }))
    const reports = list.filter(s => reportIdxOf(Number(s.renewMonth)) === monthIdx)

    out.push({ key: `${year}-${monthIdx}`, label, year, monthIdx, renewals, maintenance, reports })
  }
  return out
})
const thisMonth = computed(() => monthsOverview.value[0])
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Top bar -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Sites</h1>
        <p class="text-sm text-gray-500 mt-1">Search and browse environments</p>
      </div>
      <div class="flex items-center gap-3">
        <button @click="refresh" class="px-4 py-2 rounded-lg bg-black text-white shadow-sm disabled:opacity-60" :disabled="pending">Refresh</button>
        <NuxtLink to="/sites" class="px-4 py-2 rounded-lg bg-black text-white shadow-sm">Add Site</NuxtLink>
      </div>
    </div>

    <!-- Tabs -->
    <div class="inline-flex rounded-xl border bg-gray-50 p-1">
      <button @click="tab='overview'" :class="['px-4 py-2 rounded-lg text-sm transition', tab==='overview' ? 'bg-white shadow-sm' : 'text-gray-600 hover:bg-white/60']">Overview</button>
      <button @click="tab='months'"   :class="['px-4 py-2 rounded-lg text-sm transition', tab==='months'   ? 'bg-white shadow-sm' : 'text-gray-600 hover:bg-white/60']">Months</button>
      <button @click="tab='sites'"    :class="['px-4 py-2 rounded-lg text-sm transition', tab==='sites'    ? 'bg-white shadow-sm' : 'text-gray-600 hover:bg-white/60']">Sites</button>
    </div>

    <!-- States -->
    <div v-if="pending">Loading…</div>
    <div v-else-if="error" class="text-red-600">Failed to load sites.</div>

    <template v-else>
      <!-- OVERVIEW -->
      <div v-show="tab==='overview'" class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Maintenance this month -->
        <div class="rounded-2xl border bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-semibold">Maintenance this month</h2>
            <span class="text-xs rounded-full bg-gray-100 px-2 py-1">{{ thisMonth.maintenance.length }}</span>
          </div>
          <div class="mt-3 space-y-2" v-if="thisMonth.maintenance.length">
            <NuxtLink v-for="s in thisMonth.maintenance" :key="s.id" :to="`/site/${s.id}`" class="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-gray-50">
              <div class="min-w-0">
                <div class="truncate font-medium">{{ s.name || s.id }}</div>
                <div class="text-xs text-gray-500 truncate">{{ s.id }} • <span class="capitalize">{{ s.env }}</span></div>
              </div>
              <div class="flex gap-2 text-xs">
                <span v-if="s.preRenewal" class="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-100">Pre-renewal</span>
                <span v-if="s.midYear" class="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-100">Mid-year</span>
              </div>
            </NuxtLink>
          </div>
          <p v-else class="text-sm text-gray-500">No maintenance scheduled this month.</p>
        </div>

        <!-- Reports due this month -->
        <div class="rounded-2xl border bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-semibold">Reports due this month</h2>
            <span class="text-xs rounded-full bg-gray-100 px-2 py-1">{{ thisMonth.reports.length }}</span>
          </div>
          <div class="mt-3 space-y-2" v-if="thisMonth.reports.length">
            <NuxtLink v-for="s in thisMonth.reports" :key="s.id" :to="`/site/${s.id}`" class="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-gray-50">
              <div class="min-w-0">
                <div class="truncate font-medium">{{ s.name || s.id }}</div>
                <div class="text-xs text-gray-500 truncate">{{ s.id }} • <span class="capitalize">{{ s.env }}</span></div>
              </div>
              <span class="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100">Report</span>
            </NuxtLink>
          </div>
          <p v-else class="text-sm text-gray-500">No reports due this month.</p>
        </div>

        <!-- Renewals this month -->
        <div class="rounded-2xl border bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-semibold">Renewals this month</h2>
            <span class="text-xs rounded-full bg-gray-100 px-2 py-1">{{ thisMonth.renewals.length }}</span>
          </div>
          <div class="mt-3 space-y-2" v-if="thisMonth.renewals.length">
            <NuxtLink v-for="s in thisMonth.renewals" :key="s.id" :to="`/site/${s.id}`" class="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-gray-50">
              <div class="min-w-0">
                <div class="truncate font-medium">{{ s.name || s.id }}</div>
                <div class="text-xs text-gray-500 truncate">{{ s.id }} • <span class="capitalize">{{ s.env }}</span></div>
              </div>
              <span class="text-xs text-gray-600">{{ monthName(s.renewMonth) }}</span>
            </NuxtLink>
          </div>
          <p v-else class="text-sm text-gray-500">No renewals this month.</p>
        </div>
      </div>

      <!-- MONTHS -->
      <div v-show="tab==='months'" class="space-y-3">
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
                      <span v-if="s.preRenewal" class="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-100">Pre</span>
                      <span v-if="s.midYear" class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-100">Mid</span>
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
      <div v-show="tab==='sites'" class="space-y-4">
        <!-- Filters -->
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

        <!-- Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <NuxtLink
            v-for="s in filtered"
            :key="s.id"
            :to="`/site/${s.id}`"
            class="group block rounded-2xl border p-5 bg-white shadow-sm hover:shadow-md transition"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center border">
                  <span class="text-sm font-semibold text-gray-600">{{ (s.name || s.id || '?').slice(0,1).toUpperCase() }}</span>
                </div>
                <div>
                  <h3 class="text-base font-semibold leading-tight">{{ s.name || s.id }}</h3>
                  <div class="flex items-center gap-2 text-[11px] text-gray-500 truncate mt-0.5">
                    <span v-if="s.websiteUrl">
                      <a :href="s.websiteUrl" target="_blank" class="hover:underline">Website</a>
                    </span>
                    <span v-if="s.gitUrl">
                      <span v-if="s.websiteUrl" class="opacity-50">•</span>
                      <a :href="s.gitUrl" target="_blank" class="hover:underline">Repo</a>
                    </span>
                    <span v-if="s.primaryContact?.email || s.primaryContact?.name || s.primaryContact?.phone">
                      <span v-if="s.websiteUrl || s.gitUrl" class="opacity-50">•</span>
                      <span class="truncate">
                        {{ s.primaryContact?.name || 'Contact' }}
                        <template v-if="s.primaryContact?.email">
                          — <a :href="`mailto:${s.primaryContact.email}`" class="hover:underline">{{ s.primaryContact.email }}</a>
                        </template>
                        <template v-else-if="s.primaryContact?.phone">
                          — <a :href="`tel:${s.primaryContact.phone}`" class="hover:underline">{{ s.primaryContact.phone }}</a>
                        </template>
                      </span>
                    </span>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-gray-500">
                    <span>{{ s.id }}</span>
                    <span class="h-1 w-1 rounded-full bg-gray-300"></span>
                    <span class="capitalize">{{ s.env }}</span>
                  </div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-xs text-gray-500">Next maintenance</div>
                <div class="text-sm font-medium">
                  <span v-if="s.nextMaintenance">{{ formatRenew(s.nextMaintenance) }}</span>
                  <span v-else class="text-gray-500">{{ monthName(s.renewMonth) }}</span>
                </div>
              </div>
            </div>

            <div class="mt-4 flex items-center justify-between text-xs text-gray-500">
              <span class="inline-flex items-center gap-1 group-hover:text-gray-700">Open details →</span>
              <span v-if="s.tags?.length" class="inline-flex gap-1">
                <span v-for="t in s.tags.slice(0,3)" :key="t" class="px-2 py-0.5 rounded-full bg-gray-100 border">{{ t }}</span>
              </span>
            </div>
          </NuxtLink>
        </div>
      </div>
    </template>
  </div>
</template>
