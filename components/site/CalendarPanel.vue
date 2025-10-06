<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import type { MaintItem, MaintStatus, SiteDoc } from '~/composables/site'
import {
  STATUS_LIST,
  firstOfMonthUTC,
  formatMonth,
  formatDateLine,
  dayNum,
  dayWk,
  statusClass,
} from '~/composables/site'

// ---- Types ----
type HistoryEntry = {
  at: string | Date
  by?: { id?: string; name?: string; email?: string } | string
  from?: MaintStatus | null
  to?: MaintStatus | null
}
type LabelFlags = { reportDue?: boolean; preRenewal?: boolean; midYear?: boolean }
type ItemWithDate = MaintItem & {
  dateObj: Date
  labels?: LabelFlags
  kind?: 'report' | 'maintenance' | string
  history?: HistoryEntry[]
  updatedAt?: string | Date
  updatedBy?: HistoryEntry['by']
}

// ---- Props & Emits ----
const props = withDefaults(defineProps<{
  site?: SiteDoc
  items: (MaintItem & { dateObj?: Date; history?: HistoryEntry[] })[]
  canManageSite: boolean
  startDate?: Date
  monthsAhead?: number
  monthsBehind?: number
  isLoading?: boolean
  currentUser?: { id?: string; name?: string; email?: string }
  userDirectory?: Array<{ id?: string; name?: string; email?: string }> | Record<string, { id?: string; name?: string; email?: string }>
}>(), {
  canManageSite: false,
  monthsAhead: 12,
  monthsBehind: 12,
})

const emit = defineEmits<{
  (e:'refresh'): void
  (e:'set-status', ev: MaintItem, next: MaintStatus): void
  (e:'status-change', payload: {
    item: MaintItem
    from?: MaintStatus | null
    to: MaintStatus
    by?: { id?: string; name?: string; email?: string }
    at: Date
  }): void
}>()

// ---- Date range (past + future) ----
const start = computed(() => firstOfMonthUTC(props.startDate ?? new Date()))
const months = computed(() => {
  const out: { start: Date; end: Date; key: string }[] = []
  const baseYear = start.value.getUTCFullYear()
  const baseMonth = start.value.getUTCMonth()
  for (let i = -Math.max(0, props.monthsBehind); i < props.monthsAhead; i++) {
    const d = new Date(Date.UTC(baseYear, baseMonth + i, 1))
    const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
    out.push({ start: d, end, key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}` })
  }
  out.sort((a, b) => a.start.getTime() - b.start.getTime())
  return out
})

// ---- Year pagination ----
const years = computed(() => Array.from(new Set(months.value.map(m => m.start.getUTCFullYear()))).sort((a, b) => a - b))
const selectedYear = ref<number>(start.value.getUTCFullYear())
watch(years, (ys) => {
  if (!ys.includes(selectedYear.value) && ys.length) selectedYear.value = ys[0]
}, { immediate: true })
function prevYear() {
  const idx = years.value.indexOf(selectedYear.value)
  if (idx > 0) selectedYear.value = years.value[idx - 1]
}
function nextYear() {
  const idx = years.value.indexOf(selectedYear.value)
  if (idx >= 0 && idx < years.value.length - 1) selectedYear.value = years.value[idx + 1]
}

function isRenewalMonthUTC(monthStartUTC: Date) {
  const r = Number(props.site?.renewMonth)
  return r ? monthStartUTC.getUTCMonth() === (r - 1) : false
}

// ---- Data parsing & grouping ----
function safeDate(d: unknown): Date | null {
  const dt = d instanceof Date ? d : new Date(String(d ?? ''))
  return Number.isFinite(dt.getTime()) ? dt : null
}
const itemsWithDate = computed<ItemWithDate[]>(() =>
  (props.items ?? [])
    .map(it => {
      const date = safeDate((it as any).date)
      if (!date) return null
      return { ...it, dateObj: date }
    })
    .filter(Boolean) as ItemWithDate[]
)

/**
 * Groups items by month.
 * Optimized to iterate over items only once.
 */
const monthGroups = computed(() => {
  const map = new Map<string, { meta: { start: Date; end: Date; key: string }, items: ItemWithDate[] }>()
  for (const m of months.value) {
    map.set(m.key, { meta: m, items: [] })
  }

  for (const it of itemsWithDate.value) {
    const key = `${it.dateObj.getUTCFullYear()}-${String(it.dateObj.getUTCMonth() + 1).padStart(2, '0')}`
    if (map.has(key)) {
      map.get(key)!.items.push(it)
    }
  }

  for (const { items } of map.values()) {
    items.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime() || String(a.kind ?? '').localeCompare(String(b.kind ?? '')))
  }
  return map
})

// ---- Filters ----
const q = ref('')
const statusFilter = ref<MaintStatus | 'ALL'>('ALL')
const labelReport = ref(false)
const labelPreRen = ref(false)
const labelMid = ref(false)
type TimeScope = 'ALL' | 'UPCOMING' | 'PAST'
const timeScope = ref<TimeScope>('ALL')
const today = new Date(new Date().setUTCHours(0, 0, 0, 0))

function matchesFilters(ev: ItemWithDate): boolean {
  if (q.value.trim()) {
    const text = `${ev.kind ?? ''} ${formatDateLine(ev.dateObj)} ${(ev as any).title ?? ''} ${(ev as any).notes ?? ''}`.toLowerCase()
    if (!text.includes(q.value.trim().toLowerCase())) return false
  }
  if (statusFilter.value !== 'ALL' && (ev.status ?? 'To-Do') !== statusFilter.value) return false
  if (labelReport.value && !ev.labels?.reportDue) return false
  if (labelPreRen.value && !ev.labels?.preRenewal) return false
  if (labelMid.value && !ev.labels?.midYear) return false
  if (timeScope.value === 'UPCOMING' && ev.dateObj.getTime() < today.getTime()) return false
  if (timeScope.value === 'PAST' && ev.dateObj.getTime() >= today.getTime()) return false
  return true
}

/** Render only months in the selected year that match filters */
const monthViews = computed(() => {
  const views: Array<{
    key: string
    meta: { start: Date; end: Date; key: string }
    items: ItemWithDate[]
    summary: { total: number; byStatus: Record<string, number> }
  }> = []

  for (const [key, group] of monthGroups.value.entries()) {
    if (group.meta.start.getUTCFullYear() !== selectedYear.value) continue
    
    const filteredItems = group.items.filter(matchesFilters)
    const byStatus: Record<string, number> = {}
    for (const it of filteredItems) {
      const s = (it.status ?? 'To-Do') as string
      byStatus[s] = (byStatus[s] ?? 0) + 1
    }
    views.push({ key, meta: group.meta, items: filteredItems, summary: { total: filteredItems.length, byStatus } })
  }
  return views
})

// ---- User resolution ----
const userIndex = computed(() => {
  const out: Record<string, { id?: string; name?: string; email?: string }> = {}
  const dir = props.userDirectory
  if (!dir) return out
  const users = Array.isArray(dir) ? dir : Object.values(dir)
  for (const u of users) {
    if (!u) continue
    if (u.id) out[u.id] = u
    if (u.email) out[u.email.toLowerCase()] = u
    if (u.name) out[u.name.toLowerCase()] = u
  }
  return out
})
function resolveUser(by: HistoryEntry['by']) {
  if (!by) return undefined
  if (typeof by === 'string') return userIndex.value[by.toLowerCase()] || { name: by }
  return userIndex.value[by.id ?? ''] || userIndex.value[(by.email ?? '').toLowerCase()] || userIndex.value[(by.name ?? '').toLowerCase()] || by
}
function byLabel(by: HistoryEntry['by']): string {
  const u = resolveUser(by)
  return u?.name || u?.email || u?.id || 'Unknown'
}

// ---- Optimistic UI & History Logic ----
const optimistic = ref<Record<string, HistoryEntry[]>>({})

/** Generates a stable key for a maintenance item. */
function itemKey(ev: any) {
  return ev?._id || ev?.id || `${ev?.date}-${ev?.kind || 'm'}`
}

/** Returns the full history for an item, including optimistic updates. */
function displayHistory(ev: ItemWithDate): HistoryEntry[] {
  const base = ev.history ?? []
  const opt = optimistic.value[itemKey(ev)] ?? []
  return [...base, ...opt].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
}

/**
 * Returns the single latest history entry for an item.
 * Falls back to `updatedAt` if no formal history exists.
 * Returns `undefined` if no history information is available at all.
 */
function latestHistory(ev: ItemWithDate): HistoryEntry | undefined {
  const fullHistory = displayHistory(ev)
  if (fullHistory.length > 0) {
    return fullHistory[0]
  }
  if (ev.updatedAt) {
    return { at: ev.updatedAt, by: ev.updatedBy, to: ev.status ?? 'To-Do' }
  }
  return undefined
}

// ---- Event Handlers ----
function onChangeStatus(ev: ItemWithDate, to: MaintStatus) {
  const from = (ev.status ?? 'To-Do') as MaintStatus | null
  const at = new Date()
  const k = itemKey(ev)
  const entry: HistoryEntry = { at, by: props.currentUser, from, to }

  // Add to optimistic updates
  optimistic.value[k] = [entry, ...(optimistic.value[k] ?? [])]

  emit('set-status', ev, to)
  emit('status-change', { item: ev, from, to, by: props.currentUser, at })
}

// ---- Popover Management ----
const openPopId = ref<string | null>(null)
function togglePop(ev: any) {
  const id = itemKey(ev)
  openPopId.value = openPopId.value === id ? null : id
}
function closePop() {
  openPopId.value = null
}
function onDocClick(e: MouseEvent) {
  if (!(e.target as HTMLElement).closest('[data-popover-root]')) closePop()
}
function onDocKey(e: KeyboardEvent) {
  if (e.key === 'Escape') closePop()
}
onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onDocKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onDocKey)
})

function fmtDateTimeGB(d: Date | string) {
  return new Date(d).toLocaleString('en-GB', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
}

// ---- UX & Accessibility ----
const liveMsg = ref('')
function announce(msg: string) {
  liveMsg.value = msg
  setTimeout(() => (liveMsg.value = ''), 2000)
}
watch(() => props.isLoading, (v) => { if (v) announce('Refreshing maintenance calendar…') })

function onKey(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  if (['input', 'select', 'textarea'].includes(target.tagName.toLowerCase()) || (e as any).isComposing) return
  if (e.key === 'r' || e.key === 'R') {
    emit('refresh')
    announce('Calendar refreshed.')
  } else if (e.key === '/') {
    (document.getElementById('maint-search') as HTMLInputElement | null)?.focus()
    e.preventDefault()
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="space-y-3" aria-labelledby="maint-cal-heading">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <h2 id="maint-cal-heading" class="text-lg font-semibold tracking-tight">
          Maintenance calendar
        </h2>
        <div class="hidden md:flex items-center gap-1.5 rounded-xl border bg-white/80 px-1 py-1 shadow-sm">
          <button @click="prevYear" :disabled="years.indexOf(selectedYear) <= 0" class="icon-btn" aria-label="Previous year" title="Previous year">
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <select v-model="selectedYear" class="year-select" aria-label="Select year">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
          <button @click="nextYear" :disabled="years.indexOf(selectedYear) >= years.length - 1" class="icon-btn" aria-label="Next year" title="Next year">
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>
          </button>
        </div>
      </div>
      <div>
        <button @click="emit('refresh')" class="btn" :aria-busy="!!isLoading" title="Refresh (r)">
          <svg viewBox="0 0 24 24" class="h-4 w-4" :class="{'animate-spin': isLoading}" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 10-3.5 7.1M21 12V6m0 6h-6"/></svg>
          <span>{{ isLoading ? 'Refreshing…' : 'Refresh' }}</span>
        </button>
      </div>
    </div>

    <div class="md:hidden grid grid-cols-1 gap-2">
      <div class="flex items-center gap-2">
        <button @click="prevYear" :disabled="years.indexOf(selectedYear) <= 0" class="rounded-lg border px-2 py-2 text-sm disabled:opacity-50" aria-label="Previous year">‹</button>
        <select v-model="selectedYear" class="flex-1 rounded-lg border px-2 py-2 text-sm" aria-label="Select year">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
        <button @click="nextYear" :disabled="years.indexOf(selectedYear) >= years.length - 1" class="rounded-lg border px-2 py-2 text-sm disabled:opacity-50" aria-label="Next year">›</button>
      </div>
      <input id="maint-search" v-model="q" type="search" inputmode="search" placeholder="Search ( / )" class="rounded-lg border px-3 py-2 text-sm" aria-label="Search maintenance"/>
      <div class="grid grid-cols-2 gap-2">
        <select v-model="timeScope" class="rounded-lg border px-2 py-2 text-sm" aria-label="Filter by time window">
          <option value="ALL">All Times</option>
          <option value="UPCOMING">Upcoming</option>
          <option value="PAST">Past</option>
        </select>
        <select v-model="statusFilter" class="rounded-lg border px-2 py-2 text-sm" aria-label="Filter by status">
          <option value="ALL">All Statuses</option>
          <option v-for="s in STATUS_LIST" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <label class="inline-flex items-center gap-1.5 cursor-pointer select-none"><input type="checkbox" v-model="labelReport" class="rounded border-gray-300" /> <span class="chip chip-violet">Report</span></label>
        <label class="inline-flex items-center gap-1.5 cursor-pointer select-none"><input type="checkbox" v-model="labelPreRen" class="rounded border-gray-300" /> <span class="chip chip-amber">Pre-renewal</span></label>
        <label class="inline-flex items-center gap-1.5 cursor-pointer select-none"><input type="checkbox" v-model="labelMid" class="rounded border-gray-300" /> <span class="chip chip-blue">Mid-year</span></label>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      <section v-for="v in monthViews" :id="`month-${v.meta.key}`" :key="v.meta.key" class="rounded-2xl border bg-white p-5 shadow-sm hover:shadow transition-shadow" :aria-labelledby="`heading-${v.meta.key}`">
        <div class="flex items-center justify-between gap-3">
          <h3 :id="`heading-${v.meta.key}`" class="text-base font-semibold tracking-tight">{{ formatMonth(v.meta.start) }}</h3>
          <div class="flex items-center gap-2 text-xs text-gray-600">
            <span v-if="isRenewalMonthUTC(v.meta.start)" class="chip chip-green !py-0.5">Renewal</span>
            <span v-if="v.summary.total">{{ v.summary.total }} item{{ v.summary.total===1 ? '' : 's' }}</span>
          </div>
        </div>

        <ul v-if="v.items.length" class="mt-4 space-y-3">
          <li v-for="ev in v.items" :key="itemKey(ev)" class="group rounded-xl border px-3 py-3 hover:bg-gray-50 focus-within:ring-1 focus-within:ring-gray-300">
            <div class="grid grid-cols-[auto,1fr] items-start gap-3">
              <div class="h-12 w-12 rounded-lg border bg-white shadow-sm flex flex-col items-center justify-center">
                <div class="text-sm font-semibold leading-none">{{ dayNum(ev.dateObj) }}</div>
                <div class="text-[10px] text-gray-500 leading-none">{{ dayWk(ev.dateObj) }}</div>
              </div>
              <div class="min-w-0">
                <p class="font-medium truncate">{{ ev.kind === 'report' || ev.labels?.reportDue ? 'Report due' : 'Maintenance' }}</p>
                <div class="mt-1 flex flex-wrap gap-1.5 text-xs">
                  <span v-if="ev.labels?.reportDue" class="chip chip-violet">Report</span>
                  <span v-if="ev.labels?.preRenewal" class="chip chip-amber">Pre-renewal</span>
                  <span v-if="ev.labels?.midYear" class="chip chip-blue">Mid-year</span>
                </div>
              </div>
            </div>

            <div class="mt-3 flex items-center justify-between gap-3">
              <div v-if="latestHistory(ev)" class="relative text-xs text-gray-700" data-popover-root>
                <button type="button" @click.stop="togglePop(ev)" class="underline decoration-dotted underline-offset-2 hover:no-underline block" :aria-expanded="openPopId === itemKey(ev)" :aria-controls="`pop-${itemKey(ev)}`" title="View status change history">
                  Updated {{ fmtDateTimeGB(latestHistory(ev)!.at).slice(0, 10) }} by {{ byLabel(latestHistory(ev)!.by) }}
                </button>
                <div v-if="openPopId === itemKey(ev)" :id="`pop-${itemKey(ev)}`" role="dialog" aria-label="Status change history" class="absolute z-20 mt-2 w-80 max-w-[85vw] rounded-xl border bg-white shadow-lg p-3" @click.stop>
                  <div class="mb-2 text-xs font-semibold text-gray-700">Status Changes</div>
                  <ol class="space-y-1.5 text-xs">
                    <li v-for="(h, i) in displayHistory(ev)" :key="i" class="grid grid-cols-[auto,1fr] gap-2">
                      <span class="text-[11px] text-gray-500 whitespace-nowrap">{{ fmtDateTimeGB(h.at) }}</span>
                      <span><strong>{{ byLabel(h.by) }}</strong> — {{ h.from || 'N/A' }} → {{ h.to }}</span>
                    </li>
                    <li v-if="!displayHistory(ev).length" class="text-gray-500">No history entries.</li>
                  </ol>
                  <button type="button" @click.stop="closePop()" class="mt-3 w-full rounded-lg border px-2.5 py-1 text-xs hover:bg-gray-50">Close</button>
                  <div class="pointer-events-none absolute -top-1.5 left-4 h-3 w-3 rotate-45 border-l border-t bg-white"></div>
                </div>
              </div>
              <div v-else class="text-xs text-gray-400">No updates</div>

              <div class="flex items-center gap-2">
                <span :class="statusClass(ev.status)">{{ ev.status || 'To-Do' }}</span>
                <select v-if="canManageSite" :value="ev.status || 'To-Do'" @change="onChangeStatus(ev, ($event.target as HTMLSelectElement).value as any)" class="rounded-md border-gray-300 px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500" title="Update status" aria-label="Update status">
                  <option v-for="s in STATUS_LIST" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>
            </div>
          </li>
        </ul>
        
        <div v-else-if="isLoading" class="mt-4 rounded-xl border border-dashed px-3 py-6 text-center text-sm text-gray-500 animate-pulse">Loading…</div>
        <div v-else class="mt-4 rounded-xl border border-dashed px-3 py-6 text-center text-sm text-gray-500">No maintenance for this month.</div>
      </section>
    </div>

    <p class="sr-only" role="status" aria-live="polite">{{ liveMsg }}</p>
  </div>
</template>

<style scoped>
.btn {
  @apply inline-flex items-center gap-2 rounded-xl border bg-white/80 px-3 py-2 text-sm shadow-sm
         hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2;
}
.icon-btn {
  @apply inline-flex h-8 w-8 items-center justify-center rounded-lg
         hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:hover:bg-transparent;
}
.year-select {
  @apply bg-transparent px-2 py-1 rounded-lg text-sm border-none
         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1;
}
.chip {
  @apply inline-block rounded-full px-2 py-0.5 font-medium;
}
.chip-violet { @apply bg-violet-100 text-violet-800; }
.chip-amber { @apply bg-amber-100 text-amber-800; }
.chip-blue { @apply bg-blue-100 text-blue-800; }
.chip-green { @apply bg-emerald-100 text-emerald-800; }
</style>