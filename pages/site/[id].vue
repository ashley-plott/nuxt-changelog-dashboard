<!-- pages/site/[id].vue -->
<script setup lang="ts">
const route = useRoute()
const id = route.params.id as string

// Forward cookies on SSR so auth endpoints work
const headers = process.server ? useRequestHeaders(['cookie']) : undefined

// ---- Site & maintenance ----
const { data, pending, error, refresh: refreshSite } = await useFetch(`/api/scheduler/sites/${id}`, { headers })
const site = computed(() => data.value?.site)
const items = computed(() =>
  (data.value?.items || []).map((it:any) => ({ ...it, dateObj: new Date(it.date) }))
)

function firstOfMonthUTC(d = new Date()) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)) }
const start = firstOfMonthUTC(new Date())
const months = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1))
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
  return { start: d, end }
})
function inMonth(it:any, m:{start:Date;end:Date}) {
  const t = it.dateObj.getTime()
  return t >= m.start.getTime() && t < m.end.getTime()
}
function formatMonth(d: Date) { return d.toLocaleString(undefined, { month: 'long', year: 'numeric' }) }

// ---- Tabs ----
const tab = ref<'calendar'|'changelog'|'forms'|'notes'|'details'>('calendar')

// ---- Auth/me (for notes + details permissions) ----
const me = await $fetch('/api/auth/me', { headers }).catch(() => ({ authenticated: false }))
const authed = !!me?.authenticated
const my = authed ? me.user : null

// ---- Changelog ----
const selectedEnv = ref<string>('') // '' = All envs
watchEffect(() => {
  if (site.value && selectedEnv.value === '') {
    // default to the site's env, but user can change to All
    selectedEnv.value = site.value.env || ''
  }
})
const clLimit = ref(20)
const clPkg   = ref('')
const clFrom  = ref('')
const clTo    = ref('')
const { data: clData, pending: clPending, refresh: clRefresh } = await useAsyncData(
  'site-changelogs',
  () => $fetch('/api/changelogs', {
    query: {
      site: id,
      env: selectedEnv.value || undefined,
      limit: clLimit.value,
      pkg: clPkg.value || undefined,
      from: clFrom.value ? new Date(clFrom.value).toISOString() : undefined,
      to:   clTo.value   ? new Date(clTo.value).toISOString()   : undefined
    },
    headers
  }),
  { watch: [selectedEnv, clLimit, clPkg, clFrom, clTo] }
)
function moreChangelogs() { clLimit.value += 20 }

// ---- Forms (Gravity Forms logs) ----
const flLimit = ref(20)
const flEmail = ref('')
const flFrom  = ref('')
const flTo    = ref('')
const { data: flData, pending: flPending, refresh: flRefresh } = await useAsyncData(
  'site-formlogs',
  () => $fetch('/api/form-logs', {
    query: {
      site: id,
      env: selectedEnv.value || undefined,
      limit: flLimit.value,
      email: flEmail.value || undefined,
      from: flFrom.value ? new Date(flFrom.value).toISOString() : undefined,
      to:   flTo.value   ? new Date(flTo.value).toISOString()   : undefined
    },
    headers
  }),
  { watch: [selectedEnv, flLimit, flEmail, flFrom, flTo] }
)
function moreForms() { flLimit.value += 20 }

// ---- Notes ----
const notes = ref<{ items:any[] } | null>(null)
async function loadNotes() {
  notes.value = await $fetch(`/api/sites/${id}/notes`, {
    query: { env: site.value?.env },
    headers
  })
}
onMounted(() => { if (tab.value === 'notes') loadNotes() })
watch(tab, (t) => { if (t === 'notes' && !notes.value) loadNotes() })

const noteForm = reactive({ title: '', body: '', pinned: false })
const noteSaving = ref(false)
async function addNote() {
  if (!authed) return
  noteSaving.value = true
  try {
    await $fetch(`/api/sites/${id}/notes`, {
      method: 'POST',
      body: { ...noteForm, env: site.value?.env },
      headers
    })
    noteForm.title = ''; noteForm.body = ''; noteForm.pinned = false
    await loadNotes()
  } finally {
    noteSaving.value = false
  }
}
function canEditNote(n:any) {
  if (!authed) return false
  return my.role === 'admin' || my.role === 'manager' || String(n.author?.id) === String(my.id)
}
async function saveNote(n:any, patch:any) {
  await $fetch(`/api/sites/${id}/notes/${n._id}`, { method: 'PATCH', body: patch, headers })
  await loadNotes()
}
async function delNote(n:any) {
  if (!confirm('Delete this note?')) return
  await $fetch(`/api/sites/${id}/notes/${n._id}`, { method: 'DELETE', headers })
  await loadNotes()
}

// ---- Details (edit site) ----
const canManageSite = computed(() => authed && (my.role === 'admin' || my.role === 'manager'))
const det = reactive({ name: '', env: 'production', renewMonth: 1 })
watchEffect(() => {
  if (site.value) {
    det.name = site.value.name || ''
    det.env = site.value.env || 'production'
    det.renewMonth = Number(site.value.renewMonth || 1)
  }
})
const detSaving = ref(false)
const detMsg = ref<string|null>(null)
const detErr = ref<string|null>(null)
async function saveDetails() {
  if (!canManageSite.value) return
  detSaving.value = true
  detMsg.value = detErr.value = null
  try {
    await $fetch('/api/scheduler/sites', {
      method: 'POST',
      body: { id, name: det.name, env: det.env, renewMonth: Number(det.renewMonth) },
      headers
    })
    selectedEnv.value = det.env // keep filters in sync
    await refreshSite()
    detMsg.value = 'Saved.'
  } catch (e:any) {
    detErr.value = e?.data?.message || e?.message || 'Failed to save'
  } finally {
    detSaving.value = false
  }
}
</script>

<template>
  <div class="p-6 space-y-8">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <NuxtLink to="/dashboard" class="text-sm text-blue-600 hover:underline">← Back</NuxtLink>
      <h1 class="text-2xl font-bold ml-2">{{ site?.name || site?.id || id }}</h1>
      <span v-if="site" class="ml-auto text-sm px-2 py-1 rounded-full bg-gray-100">
        {{ site.env }} • Renew: {{ new Date(2000, (site.renewMonth || 1) - 1, 1).toLocaleString(undefined, { month: 'long' }) }}
      </span>
    </div>

    <!-- Tabs -->
    <div class="flex flex-wrap gap-2">
      <button @click="tab='calendar'"  :class="['px-3 py-2 rounded', tab==='calendar'  ? 'bg-black text-white' : 'border']">Calendar</button>
      <button @click="tab='changelog'" :class="['px-3 py-2 rounded', tab==='changelog' ? 'bg-black text-white' : 'border']">Changelog</button>
      <button @click="tab='forms'"     :class="['px-3 py-2 rounded', tab==='forms'     ? 'bg-black text-white' : 'border']">Forms</button>
      <button @click="tab='notes'"     :class="['px-3 py-2 rounded', tab==='notes'     ? 'bg-black text-white' : 'border']">Notes</button>
      <button @click="tab='details'"   :class="['px-3 py-2 rounded', tab==='details'   ? 'bg-black text-white' : 'border']">Details</button>
    </div>

    <!-- Calendar -->
    <div v-show="tab==='calendar'">
      <h2 class="text-xl font-semibold mb-3">Maintenance calendar</h2>
      <div v-if="pending">Loading…</div>
      <div v-else-if="error" class="text-red-600">Failed to load site.</div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div v-for="m in months" :key="m.start.toISOString()" class="rounded-2xl border p-5 shadow-sm bg-white">
          <h3 class="text-lg font-semibold">{{ formatMonth(m.start) }}</h3>
          <div class="mt-4 space-y-2">
            <div v-for="ev in items.filter(it => inMonth(it, m))" :key="ev.date" class="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <div class="font-medium">{{ new Date(ev.date).toLocaleDateString() }}</div>
                <div class="text-xs text-gray-500">Maintenance</div>
              </div>
              <div class="flex gap-2">
                <span v-if="ev.labels?.preRenewal" class="px-2 py-0.5 rounded text-xs bg-amber-50">Pre-renewal</span>
                <span v-if="ev.labels?.midYear" class="px-2 py-0.5 rounded text-xs bg-blue-50">Mid-year</span>
              </div>
            </div>
            <p v-if="!items.some(it => inMonth(it, m))" class="text-sm text-gray-500">No maintenance scheduled.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Changelog -->
    <div v-show="tab==='changelog'">
      <h2 class="text-xl font-semibold mb-3">Changelog</h2>
      <div class="rounded-2xl border p-5 bg-white shadow-sm space-y-4">
        <div class="flex flex-wrap items-end gap-3">
          <div>
            <label class="block text-sm font-medium">Environment</label>
            <select v-model="selectedEnv" class="border rounded px-3 py-2">
              <option value="">All</option>
              <option :value="site?.env">{{ site?.env }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium">Package</label>
            <input v-model="clPkg" placeholder="vendor/package" class="border rounded px-3 py-2" />
          </div>
          <div class="flex items-end gap-2">
            <div>
              <label class="block text-sm font-medium">From</label>
              <input v-model="clFrom" type="datetime-local" class="border rounded px-3 py-2" />
            </div>
            <div>
              <label class="block text-sm font-medium">To</label>
              <input v-model="clTo" type="datetime-local" class="border rounded px-3 py-2" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium">Limit</label>
            <input v-model.number="clLimit" type="number" min="1" class="border rounded px-3 py-2 w-24" />
          </div>
          <button @click="clRefresh" class="ml-auto px-4 py-2 rounded bg-black text-white" :disabled="clPending">Refresh</button>
        </div>

        <div v-if="clPending">Loading changes…</div>
        <div v-else-if="(clData?.items || []).length === 0" class="text-sm text-gray-500">No changelog entries.</div>
        <div v-else class="space-y-4">
          <div v-for="(entry, idx) in clData?.items || []" :key="entry._id || entry.run?.timestamp || idx" class="rounded-xl border p-4">
            <div class="flex items-center justify-between">
              <div>
                <div class="font-medium">{{ new Date(entry.run?.timestamp || entry.receivedAt).toLocaleString() }}</div>
                <div class="text-xs text-gray-500">
                  {{ entry.site?.env }}
                  <span v-if="entry.run?.git_branch"> • {{ entry.run.git_branch }}</span>
                  <span v-if="entry.run?.git_sha"> ({{ entry.run.git_sha }})</span>
                </div>
              </div>
              <div class="flex gap-2">
                <span class="px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700">Updated: {{ entry.summary?.updated_count || 0 }}</span>
                <span class="px-2 py-1 rounded-full text-xs bg-emerald-50 text-emerald-700">Added: {{ entry.summary?.added_count || 0 }}</span>
                <span class="px-2 py-1 rounded-full text-xs bg-rose-50 text-rose-700">Removed: {{ entry.summary?.removed_count || 0 }}</span>
              </div>
            </div>

            <div v-if="entry.summary?.has_changes" class="mt-3 overflow-auto">
              <table class="min-w-full text-sm">
                <thead>
                  <tr class="text-left border-b">
                    <th class="py-2 pr-4">Package</th>
                    <th class="py-2 pr-4">Old</th>
                    <th class="py-2 pr-4">New</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in entry.changes?.updated || []" :key="'u-'+p.name" class="border-b last:border-0">
                    <td class="py-2 pr-4 font-medium">{{ p.name }}</td>
                    <td class="py-2 pr-4"><code>{{ p.old }}</code></td>
                    <td class="py-2 pr-4"><code>{{ p.new }}</code></td>
                  </tr>
                  <tr v-for="p in entry.changes?.added || []" :key="'a-'+p.name" class="border-b last:border-0">
                    <td class="py-2 pr-4 font-medium text-emerald-700">{{ p.name }}</td>
                    <td class="py-2 pr-4"><em>—</em></td>
                    <td class="py-2 pr-4"><code>{{ p.new }}</code></td>
                  </tr>
                  <tr v-for="p in entry.changes?.removed || []" :key="'r-'+p.name" class="border-b last:border-0">
                    <td class="py-2 pr-4 font-medium text-rose-700">{{ p.name }}</td>
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
            <button @click="moreChangelogs" class="px-4 py-2 rounded border">Load more</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Forms -->
    <div v-show="tab==='forms'">
      <h2 class="text-xl font-semibold mb-3">Forms</h2>
      <div class="rounded-2xl border p-5 bg-white shadow-sm space-y-4">
        <div class="flex flex-wrap items-end gap-3">
          <div>
            <label class="block text-sm font-medium">Environment</label>
            <select v-model="selectedEnv" class="border rounded px-3 py-2">
              <option value="">All</option>
              <option :value="site?.env">{{ site?.env }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium">Email</label>
            <input v-model="flEmail" placeholder="name@plott.co.uk" class="border rounded px-3 py-2" />
          </div>
          <div class="flex items-end gap-2">
            <div>
              <label class="block text-sm font-medium">From</label>
              <input v-model="flFrom" type="datetime-local" class="border rounded px-3 py-2" />
            </div>
            <div>
              <label class="block text-sm font-medium">To</label>
              <input v-model="flTo" type="datetime-local" class="border rounded px-3 py-2" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium">Limit</label>
            <input v-model.number="flLimit" type="number" min="1" class="border rounded px-3 py-2 w-24" />
          </div>
          <button @click="flRefresh" class="ml-auto px-4 py-2 rounded bg-black text-white" :disabled="flPending">Refresh</button>
        </div>

        <div v-if="flPending">Loading submissions…</div>
        <div v-else-if="(flData?.items || []).length === 0" class="text-sm text-gray-500">No form submissions.</div>

        <div v-else class="space-y-4">
          <div v-for="(log, i) in flData?.items || []" :key="log._id || i" class="rounded-xl border p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="font-medium">
                  {{ new Date(log.entry?.created_at || log.receivedAt).toLocaleString() }}
                </div>
                <div class="text-xs text-gray-500">
                  {{ log.form?.title || 'Form' }} • {{ log.entry?.email }}
                </div>
              </div>
              <span class="px-2 py-1 rounded-full text-xs bg-purple-50 text-purple-700">GF submission</span>
            </div>

            <div class="mt-3 overflow-auto">
              <table class="min-w-full text-sm">
                <thead>
                  <tr class="text-left border-b">
                    <th class="py-2 pr-4">Field</th>
                    <th class="py-2 pr-4">Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(val, label) in (log.fields || {})" :key="label" class="border-b last:border-0">
                    <td class="py-2 pr-4 font-medium">{{ label }}</td>
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
            <button @click="moreForms" class="px-4 py-2 rounded border">Load more</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Notes -->
    <div v-show="tab==='notes'">
      <h2 class="text-xl font-semibold mb-3">Notes</h2>

      <div v-if="authed" class="rounded-2xl border p-5 bg-white shadow-sm space-y-3">
        <div class="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input v-model="noteForm.title" placeholder="Title" class="border rounded px-3 py-2 md:col-span-3" />
          <label class="inline-flex items-center gap-2 text-sm md:col-span-1">
            <input type="checkbox" v-model="noteForm.pinned" /> Pinned
          </label>
        </div>
        <textarea v-model="noteForm.body" rows="4" placeholder="Write a note…" class="border rounded px-3 py-2 w-full"></textarea>
        <div class="flex gap-3">
          <button @click="addNote" :disabled="noteSaving" class="px-4 py-2 rounded bg-black text-white">
            {{ noteSaving ? 'Saving…' : 'Add note' }}
          </button>
          <button @click="loadNotes" class="px-4 py-2 rounded border">Refresh</button>
        </div>
      </div>
      <div v-else class="text-sm text-gray-500">Sign in to add and manage notes.</div>

      <div class="mt-4 space-y-3">
        <div v-if="!notes?.items">
          <button @click="loadNotes" class="px-4 py-2 rounded border">Load notes</button>
        </div>
        <div v-else-if="notes.items.length === 0" class="text-sm text-gray-500">No notes yet.</div>

        <div v-else v-for="n in notes.items" :key="n._id" class="rounded-xl border p-4 bg-white">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-semibold">{{ n.title || 'Untitled' }}</h3>
                <span v-if="n.pinned" class="px-2 py-0.5 rounded text-xs bg-amber-50">Pinned</span>
              </div>
              <p class="whitespace-pre-wrap text-sm mt-1">{{ n.body }}</p>
              <p class="text-xs text-gray-500 mt-2">
                by {{ n.author?.name || n.author?.email }} • {{ new Date(n.updatedAt).toLocaleString() }}
              </p>
            </div>
            <div v-if="canEditNote(n)" class="shrink-0 flex gap-2">
              <button @click="saveNote(n, { pinned: !n.pinned })" class="text-xs underline">
                {{ n.pinned ? 'Unpin' : 'Pin' }}
              </button>
              <button @click="delNote(n)" class="text-xs text-red-600 underline">Delete</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Details -->
    <div v-show="tab==='details'">
      <h2 class="text-xl font-semibold mb-3">Site details</h2>
      <div class="rounded-2xl border p-5 bg-white shadow-sm space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium">Site ID</label>
            <input :value="id" disabled class="border rounded px-3 py-2 w-full bg-gray-50" />
          </div>
          <div>
            <label class="block text-sm font-medium">Name</label>
            <input v-model="det.name" class="border rounded px-3 py-2 w-full" :disabled="!canManageSite" />
          </div>
          <div>
            <label class="block text-sm font-medium">Environment</label>
            <select v-model="det.env" class="border rounded px-3 py-2 w-full" :disabled="!canManageSite">
              <option value="production">production</option>
              <option value="staging">staging</option>
              <option value="dev">dev</option>
              <option value="test">test</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium">Renew month (1–12)</label>
            <input v-model.number="det.renewMonth" type="number" min="1" max="12" class="border rounded px-3 py-2 w-full" :disabled="!canManageSite" />
            <p class="text-xs text-gray-500 mt-1">
              Pre-renewal maintenance is scheduled one month before this.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button v-if="canManageSite" @click="saveDetails" :disabled="detSaving" class="px-4 py-2 rounded bg-black text-white">
            {{ detSaving ? 'Saving…' : 'Save details' }}
          </button>
          <p v-if="detMsg" class="text-emerald-700 text-sm">{{ detMsg }}</p>
          <p v-if="detErr" class="text-red-600 text-sm">{{ detErr }}</p>
          <p v-if="!canManageSite" class="text-sm text-gray-500">Sign in as a manager or admin to edit.</p>
        </div>

        <p class="text-xs text-gray-500">
          Saving updates the site and ensures upcoming maintenance entries exist.
        </p>
      </div>
    </div>
  </div>
</template>
