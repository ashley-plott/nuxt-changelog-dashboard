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

/** ---- Types ---- */
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

/** ---- Props & Emits ---- */
const props = withDefaults(defineProps<{
  site?: SiteDoc
  items: (MaintItem & { dateObj?: Date; history?: HistoryEntry[] })[]
  canManageSite: boolean

  /** Anchor month (defaults to current month UTC) */
  startDate?: Date
  /** How many months to show after start (inclusive of start) */
  monthsAhead?: number
  /** How many months to include before start */
  monthsBehind?: number
  /** Show loading placeholders per-month when empty */
  isLoading?: boolean

  /** Current user (for status-change emit & optimistic history) */
  currentUser?: { id?: string; name?: string; email?: string }

  /**
   * User directory to resolve "by" fields.
   * Can be an array of users or a map keyed by id/email/name.
   */
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

/** ---- Date range (past + future) ---- */
const start = computed(() => firstOfMonthUTC(props.startDate ?? new Date()))
const months = computed(() => {
  const out: { start: Date; end: Date; key: string }[] = []
  for (let i = -Math.max(0, props.monthsBehind ?? 0); i < (props.monthsAhead ?? 0); i++) {
    const d = new Date(Date.UTC(start.value.getUTCFullYear(), start.value.getUTCMonth() + i, 1))
    const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
    out.push({ start: d, end, key: `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}` })
  }
  out.sort((a,b)=>a.start.getTime()-b.start.getTime())
  return out
})

/** ---- Year pagination ---- */
const years = computed(() => {
  const set = new Set<number>()
  for (const m of months.value) set.add(m.start.getUTCFullYear())
  return Array.from(set).sort((a,b)=>a-b)
})
const selectedYear = ref<number>(start.value.getUTCFullYear())
watch(years, (ys) => {
  if (!ys.includes(selectedYear.value) && ys.length) selectedYear.value = ys[0]
})
function prevYear() {
  const ys = years.value
  const idx = ys.indexOf(selectedYear.value)
  if (idx > 0) selectedYear.value = ys[idx-1]
}
function nextYear() {
  const ys = years.value
  const idx = ys.indexOf(selectedYear.value)
  if (idx >= 0 && idx < ys.length-1) selectedYear.value = ys[idx+1]
}

function isRenewalMonthUTC(monthStartUTC: Date) {
  const r = Number(props.site?.renewMonth || 0)
  if (!r) return false
  return monthStartUTC.getUTCMonth() === (r - 1)
}

/** ---- Data parsing & grouping ---- */
function safeDate(d: unknown): Date | null {
  const dt = d instanceof Date ? d : new Date(String(d ?? ''))
  return Number.isFinite(dt.getTime()) ? dt : null
}
const itemsWithDate = computed<ItemWithDate[]>(() =>
  (props.items ?? [])
    .map(it => {
      const date = safeDate((it as any).date)
      if (!date) return null
      return { ...(it as any), dateObj: date }
    })
    .filter(Boolean) as ItemWithDate[]
)

function inMonth(it: ItemWithDate, m: { start: Date; end: Date }) {
  const t = it.dateObj.getTime()
  return t >= m.start.getTime() && t < m.end.getTime()
}

const monthGroups = computed(() => {
  const map = new Map<string, { meta: { start: Date; end: Date; key: string }, items: ItemWithDate[] }>()
  for (const m of months.value) map.set(m.key, { meta: m, items: [] })
  for (const it of itemsWithDate.value) {
    for (const m of months.value) {
      if (inMonth(it, m)) { map.get(m.key)!.items.push(it); break }
    }
  }
  for (const { items } of map.values()) {
    items.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime() || String(a.kind ?? '').localeCompare(String(b.kind ?? '')))
  }
  return map
})

/** ---- Filters ---- */
const q = ref('')
const statusFilter = ref<MaintStatus | 'ALL'>('ALL')
const labelReport = ref(false)
const labelPreRen = ref(false)
const labelMid = ref(false)
type TimeScope = 'ALL' | 'UPCOMING' | 'PAST'
const timeScope = ref<TimeScope>('ALL')

const today = new Date()
today.setUTCHours(0,0,0,0)

function matchesFilters(ev: ItemWithDate): boolean {
  const text = `${ev.kind ?? ''} ${formatDateLine(ev.dateObj)} ${(ev as any).title ?? ''} ${(ev as any).notes ?? ''}`.toLowerCase()
  if (q.value.trim() && !text.includes(q.value.trim().toLowerCase())) return false
  if (statusFilter.value !== 'ALL' && (ev.status ?? 'To-Do') !== statusFilter.value) return false
  if (labelReport.value && !ev.labels?.reportDue) return false
  if (labelPreRen.value && !ev.labels?.preRenewal) return false
  if (labelMid.value && !ev.labels?.midYear) return false
  if (timeScope.value === 'UPCOMING' && ev.dateObj.getTime() < today.getTime()) return false
  if (timeScope.value === 'PAST' && ev.dateObj.getTime() >= today.getTime()) return false
  return true
}

/** Render only months in the selected year */
const monthViews = computed(() => {
  const views: Array<{
    key: string
    meta: { start: Date; end: Date; key: string }
    items: ItemWithDate[]
    summary: { total: number; byStatus: Record<string, number> }
  }> = []
  for (const [key, group] of monthGroups.value.entries()) {
    if (group.meta.start.getUTCFullYear() !== selectedYear.value) continue
    const filtered = group.items.filter(matchesFilters)
    const byStatus: Record<string, number> = {}
    for (const it of filtered) {
      const s = (it.status ?? 'To-Do') as string
      byStatus[s] = (byStatus[s] ?? 0) + 1
    }
    views.push({ key, meta: group.meta, items: filtered, summary: { total: filtered.length, byStatus } })
  }
  return views
})

/** ---- User resolution (fixes "Unknown") ---- */
function normalizeDir(): Record<string, { id?: string; name?: string; email?: string }> {
  const out: Record<string, { id?: string; name?: string; email?: string }> = {}
  const dir = props.userDirectory
  if (!dir) return out
  if (Array.isArray(dir)) {
    for (const u of dir) {
      if (!u) continue
      if (u.id) out[u.id] = u
      if (u.email) out[u.email.toLowerCase()] = u
      if (u.name) out[u.name.toLowerCase()] = u
    }
  } else {
    for (const k of Object.keys(dir)) {
      const u = (dir as any)[k]
      if (!u) continue
      out[k] = u
      if (u.id) out[u.id] = u
      if (u.email) out[u.email.toLowerCase()] = u
      if (u.name) out[u.name.toLowerCase()] = u
    }
  }
  return out
}
const userIndex = computed(normalizeDir)

function resolveUser(by: HistoryEntry['by'] | undefined) {
  if (!by) return undefined
  if (typeof by === 'string') {
    // try lookup by id/email/name
    const key = by.toLowerCase?.() ?? by
    return userIndex.value[key] || { name: by }
  }
  // object
  const idMatch = by.id ? userIndex.value[by.id] : undefined
  const emailMatch = by.email ? userIndex.value[(by.email || '').toLowerCase()] : undefined
  const nameMatch = by.name ? userIndex.value[(by.name || '').toLowerCase()] : undefined
  return idMatch || emailMatch || nameMatch || by
}
function byLabel(by: HistoryEntry['by']): string {
  const u = resolveUser(by)
  if (!u) return 'Unknown'
  if (typeof u === 'string') return u
  return u.name || u.email || u.id || 'Unknown'
}

/** ---- Optimistic local history (so latest update shows immediately) ---- */
const optimistic = ref<Record<string, HistoryEntry[]>>({})
function itemKey(ev: any) {
  return ev?._id || ev?.id || `${ev?.date}-${ev?.kind || 'm'}`
}
function displayHistory(ev: ItemWithDate): HistoryEntry[] {
  const base = (ev.history ?? []).slice()
  const opt = optimistic.value[itemKey(ev)] ?? []
  // merged; then sort desc
  const merged = base.concat(opt)
  merged.sort((a,b)=> new Date(b.at).getTime() - new Date(a.at).getTime())
  return merged
}
function latestHistory(ev: ItemWithDate): HistoryEntry | undefined {
  const merged = displayHistory(ev)
  if (merged.length) return merged[0]
  if (ev.updatedAt) return { at: ev.updatedAt, by: ev.updatedBy, to: ev.status ?? 'To-Do' }
  return undefined
}

/** ---- Status change (no notes) ---- */
function onChangeStatus(ev: ItemWithDate, to: MaintStatus) {
  const from = (ev.status ?? 'To-Do') as MaintStatus | null
  const at = new Date()

  // optimistic entry using currentUser (so name shows immediately)
  const k = itemKey(ev)
  const entry: HistoryEntry = { at, by: props.currentUser, from, to }
  optimistic.value[k] = [entry, ...(optimistic.value[k] ?? [])]

  emit('set-status', ev, to)
  emit('status-change', {
    item: ev,
    from,
    to,
    by: props.currentUser,
    at,
  })
}

/** ---- Popover: “Last updated” history (who & when only) ---- */
const openPopId = ref<string | null>(null)
function togglePop(ev: any) {
  const id = itemKey(ev)
  openPopId.value = openPopId.value === id ? null : id
}
function closePop() { openPopId.value = null }

function onDocClick(e: MouseEvent) {
  const t = e.target as HTMLElement
  if (!t.closest?.('[data-popover-root]')) closePop()
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
  const dt = new Date(d)
  return dt.toLocaleString('en-GB', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
}

/** ---- UX bits ---- */
const liveMsg = ref('')
function announce(msg: string) { liveMsg.value = msg; window.setTimeout(() => (liveMsg.value = ''), 2000) }
watch(() => props.isLoading, (v) => { if (v) announce('Refreshing maintenance calendar…') })

function onKey(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'select' || tag === 'textarea' || (e as any).isComposing) return
  if (e.key === 'r' || e.key === 'R') { emit('refresh'); announce('Calendar refreshed.') }
  else if (e.key === '/') { (document.getElementById('maint-search') as HTMLInputElement | null)?.focus(); e.preventDefault() }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="space-y-3" aria-labelledby="maint-cal-heading">
    <!-- Simple clean toolbar -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <!-- Title + Year pager -->
      <div class="flex items-center gap-3">
        <h2 id="maint-cal-heading" class="text-lg font-semibold tracking-tight">
          Maintenance calendar
        </h2>

        <div class="flex items-center gap-1.5 rounded-xl border bg-white/80 px-1 py-1 shadow-sm">
          <!-- Prev -->
          <button
            @click="prevYear"
            class="icon-btn"
            aria-label="Previous year"
            title="Previous year"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>

          <!-- Year select -->
          <select
            :value="selectedYear"
            @change="selectedYear = Number(($event.target as HTMLSelectElement).value)"
            class="year-select"
            aria-label="Select year"
          >
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>

          <!-- Next -->
          <button
            @click="nextYear"
            class="icon-btn"
            aria-label="Next year"
            title="Next year"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 6l6 6-6 6"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Refresh -->
      <div>
        <button
          @click="emit('refresh')"
          class="btn"
          :aria-busy="!!isLoading"
          title="Refresh (r)"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 10-3.5 7.1M21 12V6m0 6h-6"/>
          </svg>
          <span v-if="!isLoading">Refresh</span>
          <span v-else>Refreshing…</span>
        </button>
      </div>
    </div>

    <!-- Mobile filters -->
    <div class="md:hidden grid grid-cols-1 gap-2">
      <div class="flex items-center gap-2">
        <button
          @click="prevYear"
          :disabled="years.indexOf(selectedYear) <= 0"
          class="rounded-lg border px-2 py-2 text-sm disabled:opacity-50"
        >‹</button>
        <select
          :value="selectedYear"
          @change="selectedYear = Number(($event.target as HTMLSelectElement).value)"
          class="flex-1 rounded-lg border px-2 py-2 text-sm"
          aria-label="Select year"
        >
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
        <button
          @click="nextYear"
          :disabled="years.indexOf(selectedYear) === years.length - 1"
          class="rounded-lg border px-2 py-2 text-sm disabled:opacity-50"
        >›</button>
      </div>

      <input
        id="maint-search" :value="q" @input="q = ($event.target as HTMLInputElement).value"
        type="search" inputmode="search" placeholder="Search ( / )"
        class="rounded-lg border px-3 py-2 text-sm"
        aria-label="Search maintenance"
      />
      <div class="flex items-center gap-2">
        <select
          :value="timeScope" @change="timeScope = (($event.target as HTMLSelectElement).value as any)"
          class="flex-1 rounded-lg border px-2 py-2 text-sm"
          aria-label="Filter by time window"
        >
          <option value="ALL">All</option>
          <option value="UPCOMING">Upcoming</option>
          <option value="PAST">Past</option>
        </select>
        <select
          :value="statusFilter" @change="statusFilter = (($event.target as HTMLSelectElement).value as any)"
          class="flex-1 rounded-lg border px-2 py-2 text-sm"
          aria-label="Filter by status"
        >
          <option value="ALL">All statuses</option>
          <option v-for="s in STATUS_LIST" :key="s" :value="s">{{ s }}</option>
        </select>
        <button
          @click="labelReport = labelPreRen = labelMid = false; q = ''; statusFilter = 'ALL'; timeScope='ALL'"
          class="rounded-lg border px-3 py-2 text-sm"
        >Clear</button>
      </div>
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <label class="inline-flex items-center gap-1 cursor-pointer select-none">
          <input type="checkbox" v-model="labelReport" class="rounded border" /> <span class="chip chip-violet">Report</span>
        </label>
        <label class="inline-flex items-center gap-1 cursor-pointer select-none">
          <input type="checkbox" v-model="labelPreRen" class="rounded border" /> <span class="chip chip-amber">Pre-renewal</span>
        </label>
        <label class="inline-flex items-center gap-1 cursor-pointer select-none">
          <input type="checkbox" v-model="labelMid" class="rounded border" /> <span class="chip chip-blue">Mid-year</span>
        </label>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      <section
        v-for="v in monthViews"
        :id="`month-${v.meta.key}`"
        :key="v.meta.key"
        class="rounded-2xl border bg-white p-5 shadow-sm hover:shadow transition-shadow"
        :aria-labelledby="`heading-${v.meta.key}`"
      >
        <div class="flex items-center justify-between">
          <h3 :id="`heading-${v.meta.key}`" class="text-base font-semibold tracking-tight">
            {{ formatMonth(v.meta.start) }}
          </h3>
          <div class="flex items-center gap-2">
            <span v-if="isRenewalMonthUTC(v.meta.start)" class="rounded-full border px-2 py-0.5 text-xs bg-emerald-50 text-emerald-700">Renewal</span>
            <span class="text-xs text-gray-600">
              <template v-if="v.summary.total">
                {{ v.summary.total }} item{{ v.summary.total===1 ? '' : 's' }}
                <span class="mx-1 text-gray-300">•</span>
                <span v-for="(n, s) in v.summary.byStatus" :key="s" class="mr-1 last:mr-0">{{ s }}: {{ n }}</span>
              </template>
              <template v-else>No items</template>
            </span>
          </div>
        </div>

        <ul class="mt-4 space-y-2">
          <li
            v-for="ev in v.items"
            :key="(ev as any)._id || (ev as any).id || `${ev.date}-${ev.kind || 'm'}`"
            class="group grid grid-cols-[auto,1fr,auto] items-start gap-3 rounded-xl border px-4 py-4 hover:bg-gray-50 focus-within:ring-1 focus-within:ring-gray-200"
          >
            <!-- date tile -->
            <div class="h-12 w-12 rounded-lg border bg-white shadow-sm flex flex-col items-center justify-center">
              <div class="text-sm font-semibold leading-none">{{ dayNum(ev.dateObj) }}</div>
              <div class="text-[10px] text-gray-500 leading-none">{{ dayWk(ev.dateObj) }}</div>
            </div>

            <!-- main -->
            <div class="min-w-0">
              <div class="font-medium truncate">
                {{ ev.kind === 'report' || ev.labels?.reportDue ? 'Report due' : 'Maintenance' }}
              </div>
              <div class="text-xs text-gray-500">{{ formatDateLine(ev.dateObj) }}</div>
              <div class="mt-1 flex flex-wrap gap-1.5 text-xs">
                <span v-if="ev.labels?.reportDue"  class="chip chip-violet">Report</span>
                <span v-if="ev.labels?.preRenewal" class="chip chip-amber">Pre-renewal</span>
                <span v-if="ev.labels?.midYear"    class="chip chip-blue">Mid-year</span>
              </div>

              <!-- Last updated -> Popover trigger -->
              <div
                class="mt-2 text-[11px] text-gray-700 relative"
                v-if="latestHistory(ev)"
                data-popover-root
              >
                <button
                  type="button"
                  class="underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 rounded-sm"
                  @click.stop="togglePop(ev)"
                  :aria-expanded="openPopId === ((ev as any)._id || (ev as any).id || `${ev.date}-${ev.kind || 'm'}`) ? 'true' : 'false'"
                  :aria-controls="`pop-${(ev as any)._id || (ev as any).id || `${ev.date}-${ev.kind || 'm'}`}`"
                  title="View status change history"
                >
                  Last updated {{ fmtDateTimeGB(latestHistory(ev)!.at) }} by {{ byLabel(latestHistory(ev)!.by) }}
                </button>

                <!-- Popover -->
                <div
                  v-if="openPopId === ((ev as any)._id || (ev as any).id || `${ev.date}-${ev.kind || 'm'}`)"
                  :id="`pop-${(ev as any)._id || (ev as any).id || `${ev.date}-${ev.kind || 'm'}`}`"
                  role="dialog"
                  aria-label="Status change history"
                  class="absolute z-20 mt-2 w-80 max-w-[85vw] rounded-xl border bg-white shadow-lg p-3"
                  @click.stop
                >
                  <div class="mb-2 text-xs font-semibold text-gray-700">Status changes</div>
                  <ol class="space-y-1.5 text-xs">
                    <li
                      v-for="(h,i) in displayHistory(ev)"
                      :key="i"
                      class="grid grid-cols-[auto,1fr] gap-2"
                    >
                      <span class="text-[11px] text-gray-500 whitespace-nowrap">{{ fmtDateTimeGB(h.at) }}</span>
                      <span>
                        <strong>{{ byLabel(h.by) }}</strong>
                        <template v-if="h.from || h.to"> — {{ h.from || 'To-Do' }} → {{ h.to || 'To-Do' }}</template>
                      </span>
                    </li>
                    <li v-if="!displayHistory(ev).length" class="text-gray-500">No history entries.</li>
                  </ol>

                  <div class="mt-3 flex justify-end">
                    <button
                      type="button"
                      class="rounded-lg border px-2.5 py-1 text-xs hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                      @click.stop="closePop()"
                    >Close</button>
                  </div>

                  <div class="pointer-events-none absolute -top-2 left-4 h-4 w-4 rotate-45 border-l border-t bg-white"></div>
                </div>
              </div>
            </div>

            <!-- status / control -->
            <div class="flex items-center gap-2 col-span-3">
              <span :class="statusClass(ev.status)">{{ ev.status || 'To-Do' }}</span>
              <select
                v-if="canManageSite"
                :value="ev.status || 'To-Do'"
                @change="onChangeStatus(ev, ($event.target as HTMLSelectElement).value as any)"
                class="rounded-md border px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                title="Update status"
                aria-label="Update status"
              >
                <option v-for="s in STATUS_LIST" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
          </li>
        </ul>

        <div v-if="!v.items.length && !isLoading" class="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-gray-500">
          No maintenance for this month.
        </div>
        <div v-if="isLoading && !v.items.length" class="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-gray-500 animate-pulse">
          Loading…
        </div>
      </section>
    </div>

    <p class="sr-only" role="status" aria-live="polite">{{ liveMsg }}</p>
  </div>
</template>

<style scoped>
.btn {
  @apply inline-flex items-center gap-2 rounded-xl border bg-white/80 px-3 py-2 text-sm shadow-sm
         hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10;
}
.icon-btn {
  @apply inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-white/80 shadow-sm
         hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 disabled:opacity-50;
}
.year-select {
  @apply bg-white/80 px-3 py-1.5 rounded-lg text-sm shadow-sm border
         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10;
}
</style>

