<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch, watchEffect } from 'vue'
import { useRoute, useRouter, useFetch, useRequestHeaders } from '#imports'
import type { SiteDoc, MaintItem, TabKey, MaintStatus, PrimaryContact } from '~/composables/site'
import { STATUS_LIST } from '~/composables/site'
import SiteHeader from '~/components/site/SiteHeader.vue'
import TabButton from '~/components/site/TabButton.vue'
import CalendarPanel from '~/components/site/CalendarPanel.vue'
import ChangelogPanel from '~/components/site/ChangelogPanel.vue'
import FormsPanel from '~/components/site/FormsPanel.vue'
import NotesPanel from '~/components/site/NotesPanel.vue'
import DetailsPanel from '~/components/site/DetailsPanel.vue'
import '~/assets/site.css'

const route = useRoute()
const router = useRouter()
const id = route.params.id as string
const headers = process.server ? useRequestHeaders(['cookie']) : undefined

// --- Auth ---
const me = await $fetch<{ authenticated: boolean; user?: any }>('/api/auth/me', { headers }).catch(() => ({ authenticated: false }))
const authed = !!me?.authenticated
const my = authed ? me.user : null

// Site & maintenance
const { data, pending, error, refresh: refreshSite } = await useFetch<{ site: SiteDoc; items: MaintItem[] }>(
  `/api/scheduler/sites/${id}`, { headers, key: `site-${id}` }
)
const site  = computed(() => data.value?.site)
const items = computed(() => (data.value?.items || []))

// === User directory (for resolving "by" to a display name) ===
/** You can change this endpoint to match your API. It should return an array of { id?, name?, email? } */
const { data: directoryData } = await useFetch<Array<{ id?: string; name?: string; email?: string }>>(
  '/api/users/directory', { headers, key: `users-dir` }
)
const userDirectory = computed(() => directoryData.value || [])

// Tabs
const tab = ref<TabKey>('calendar')

// ----- DISPLAY HELPERS -----
const displayWebsiteUrl = computed(() => {
  const s = site.value as any
  return (s?.websiteUrl || s?.url || '') as string
})
const displayGitUrl = computed(() => site.value?.gitUrl || '')
const displayContact = computed<PrimaryContact | null>(() => site.value?.primaryContact || null)

const renewMonthName = computed(() => {
  const month = (site.value?.renewMonth || 1) - 1
  const date = new Date(2000, Math.max(0, Math.min(11, month)), 1)
  return date.toLocaleString(undefined, { month: 'long' })
})

const canManageSite = computed(() => authed && (my?.role==='admin'||my?.role==='manager'))

// Counts (placeholders for header pills)
const counts = computed(() => ({
  calendar: items.value.length,
  changelog: undefined,
  forms: undefined,
  notes: undefined
}))

// ===== Keyboard shortcuts =====
const chord = reactive({ waiting: false, timer: 0 as any })
function startChord(){ chord.waiting = true; clearTimeout(chord.timer); chord.timer = setTimeout(() => { chord.waiting = false }, 800) }
function handleKeydown(e: KeyboardEvent){
  const t = e.target as HTMLElement
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
  if (e.key.toLowerCase() === 'g') { startChord(); return }
  if (chord.waiting) {
    const m: Record<string, TabKey> = { c:'calendar', l:'changelog', f:'forms', n:'notes', d:'details' }
    const k = m[e.key.toLowerCase()]; if (k) { tab.value = k; e.preventDefault() }
    chord.waiting = false; return
  }
  if (e.key === 'r') { refreshSite(); e.preventDefault(); }
  if (e.key === 'e') { tab.value = 'details'; e.preventDefault(); }
  if (e.key >= '1' && e.key <= '5') {
    const map: Record<string, TabKey> = { '1':'calendar','2':'changelog','3':'forms','4':'notes','5':'details' }
    tab.value = map[e.key]; e.preventDefault()
  }
}
const compact = ref(false)
function onScroll () { compact.value = window.scrollY > 16 }
onMounted(() => { window.addEventListener('keydown', handleKeydown); window.addEventListener('scroll', onScroll, { passive: true }) })
onBeforeUnmount(() => { window.removeEventListener('keydown', handleKeydown); window.removeEventListener('scroll', onScroll) })

// CI badge
const latestCi = ref<any>(null)
const repoSlug = computed(() => {
  const url = displayGitUrl.value || ''
  if (!url) return ''
  try { return new URL(url).pathname.replace(/^\//, '').replace(/\.git$/, '') }
  catch {
    const m = url.match(/github\.com[:/](.+?)(?:\.git)?$/i)
    return m ? m[1] : ''
  }
})
watchEffect(async () => {
  if (!repoSlug.value) return
  latestCi.value = await $fetch('/api/ci/latest', { query: { repo: repoSlug.value, env: site.value?.env || 'production' } }).catch(() => null)
})
watch([repoSlug, () => site.value?.env], async ([slug, env]) => {
  if (!slug) { latestCi.value = null; return }
  latestCi.value = await $fetch('/api/ci/latest', { query: { repo: slug, env: env || 'production' } }).catch(() => null)
}, { immediate: true })

// ====== Actions passed down ======
async function setItemStatus(ev: MaintItem, next: MaintStatus) {
  if (!(my?.role === 'admin' || my?.role === 'manager')) return
  await $fetch('/api/scheduler/maintenance/status', {
    method: 'PATCH',
    body: { siteId: ev.site.id, env: ev.site.env, date: ev.date, status: next },
    headers
  }).catch(() => {})
  await refreshSite()
}

/** optional audit persist; adjust endpoint to your API.
 * The CalendarPanel shows the change immediately (optimistic), we also refresh to pull server history.
 */
async function recordStatusChange(...args: any[]) {
  // if first arg is an object with `item`, use it; otherwise treat positional args
  let payload: any
  if (args.length === 1 && args[0] && typeof args[0] === 'object') {
    payload = args[0]
  } else if (args.length >= 3) {
    payload = { item: args[0], from: args[1], to: args[2], by: args[3], at: args[4] }
  }

  if (!payload?.item) return // nothing to do

  try {
    await $fetch('/api/scheduler/maintenance/audit', {
      method: 'POST',
      body: {
        siteId: payload.item.site.id,
        env: payload.item.site.env,
        date: payload.item.date,
        from: payload.from ?? null,
        to: payload.to,
        by: payload.by,
        at: payload.at || new Date(),
      },
      headers
    })
  } catch {}
  await refreshSite()
}


function copyToClipboard(text: string){
  try { navigator.clipboard.writeText(text) } catch {}
}
</script>

<template>
  <div class="min-h-screen bg-neutral-50">
    <!-- Sticky Header -->
    <header
      class="sticky top-0 z-50 border-b border-black/5 bg-white/60 backdrop-blur-xl supports-[backdrop-filter]:bg-white/50"
      :class="compact ? 'py-2' : 'py-3 sm:py-4'"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SiteHeader
          :id="id"
          :site="site"
          :display-website-url="displayWebsiteUrl"
          :display-git-url="displayGitUrl"
          :renew-month-name="renewMonthName"
          :latest-ci="latestCi"
          @copy="copyToClipboard"
        />

        <!-- Tabs -->
        <div class="mt-4">
          <div class="inline-flex items-center gap-1 rounded-2xl border border-black/5 bg-gray-50/80 p-1 shadow-sm">
            <TabButton label="Calendar"  :active="tab==='calendar'"  @click="tab='calendar'"  :count="counts.calendar"  icon="M8 7v10m8-10v10M4 5h16M4 19h16"/>
            <TabButton label="Changelog" :active="tab==='changelog'" @click="tab='changelog'" :count="counts.changelog" icon="M5 12h14M5 6h14M5 18h10"/>
            <TabButton label="Forms"     :active="tab==='forms'"     @click="tab='forms'"     :count="counts.forms"     icon="M4 7h16M4 12h16M4 17h8"/>
            <TabButton label="Notes"     :active="tab==='notes'"     @click="tab='notes'"     :count="counts.notes"     icon="M12 20l9-5-9-5-9 5 9 5z"/>
            <TabButton label="Details"   :active="tab==='details'"   @click="tab='details'"   :count="undefined"        icon="M12 20v-6m0-8v2m0 0a4 4 0 110 8 4 4 0 010-8z"/>
          </div>
          <p class="text-[11px] text-gray-500 mt-1">
            Shortcuts: <kbd class="kbd">g</kbd> then <kbd class="kbd">c</kbd>/<kbd class="kbd">l</kbd>/<kbd class="kbd">f</kbd>/<kbd class="kbd">n</kbd>/<kbd class="kbd">d</kbd>. Also <kbd class="kbd">1–5</kbd>, <kbd class="kbd">r</kbd> refresh, <kbd class="kbd">e</kbd> details.
          </p>
        </div>
      </div>
      <div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent"></div>
    </header>

    <!-- Content -->
    <div class="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 md:space-y-8">
      <div v-if="pending" class="rounded-2xl border bg-white p-6 shadow-sm">
        <div class="animate-pulse space-y-3">
          <div class="h-4 w-40 bg-gray-200 rounded"></div>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            <div v-for="i in 6" :key="i" class="h-40 rounded-2xl border bg-gray-50"></div>
          </div>
        </div>
      </div>
      <div v-else-if="error" class="rounded-2xl border bg-white p-8 text-center text-sm text-red-600 shadow-sm">Failed to load site.</div>

      <!-- CALENDAR -->
      <CalendarPanel
        v-show="tab==='calendar'"
        :items="items"
        :can-manage-site="canManageSite"
        :current-user="{ id: my?.id, name: my?.name, email: my?.email }"
        :user-directory="userDirectory"
        :months-ahead="36"
        :months-behind="36"
        @set-status="setItemStatus"
        @status-change="recordStatusChange"
      />

      <ChangelogPanel v-show="tab==='changelog'" :site-id="id" :env="site?.env || ''" />

      <FormsPanel v-show="tab==='forms'" :site-id="id" :env="site?.env || ''" />

      <NotesPanel v-show="tab==='notes'" :site-id="id" :env="site?.env" :authed="authed" :my="my" />

      <DetailsPanel
        v-show="tab==='details'"
        :id="id"
        :site="site"
        :can-manage-site="canManageSite"
        @saved="refreshSite"
        @deleted="(to)=>router.push(to)"
      />
    </div>
  </div>
</template>
