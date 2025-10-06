<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import type { SiteDoc, PrimaryContact } from '~/composables/site'

const props = defineProps<{
  id: string
  site: SiteDoc | undefined
  displayWebsiteUrl: string
  displayGitUrl: string
  renewMonthName: string
  latestCi: any
}>()

const emit = defineEmits<{
  (e:'copy', text:string): void
}>()

const siteInitial = computed(() => (props.site?.name || props.site?.id || props.id).slice(0,1).toUpperCase())
const siteHostname = computed(() => {
  try { return props.displayWebsiteUrl ? new URL(props.displayWebsiteUrl).hostname : '' } catch { return '' }
})

// Favicon fallback logic
const favPrimary  = computed(() => siteHostname.value ? `https://www.google.com/s2/favicons?sz=64&domain=${siteHostname.value}` : '')
const favFallback = computed(() => siteHostname.value ? `https://icons.duckduckgo.com/ip3/${siteHostname.value}.ico` : '')
const favTriedFallback = ref(false)
const favHide = ref(false)
function onFavError(){
  if(!favTriedFallback.value) favTriedFallback.value = true
  else favHide.value = true
}

// Popover State Management
const displayContact = computed<PrimaryContact | null>(() => props.site?.primaryContact || null)
const isContactOpen = ref(false)
const isActionMenuOpen = ref(false) // State for new mobile action menu

function toggleContactPopover() {
  isContactOpen.value = !isContactOpen.value
  isActionMenuOpen.value = false // Close other popover
}
function toggleActionMenu() {
  isActionMenuOpen.value = !isActionMenuOpen.value
  isContactOpen.value = false // Close other popover
}
function closeAllPopovers() {
  isContactOpen.value = false
  isActionMenuOpen.value = false
}

function onDocClick(e: MouseEvent) {
  if (!(e.target as HTMLElement).closest('[data-popover-root]')) {
    closeAllPopovers()
  }
}
function onDocKey(e: KeyboardEvent) { if (e.key === 'Escape') closeAllPopovers() }

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onDocKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onDocKey)
})
</script>

<template>
  <div class="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 bg-slate-50 p-4 sm:p-6 rounded-2xl">
    <div class="flex-shrink-0 relative h-16 w-16 rounded-2xl overflow-hidden shadow-md ring-1 ring-black/5 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
      <img v-if="siteHostname && !favHide" :src="favTriedFallback ? favFallback : favPrimary" @error="onFavError" :alt="site?.name || 'Site Favicon'" class="h-9 w-9 object-contain" decoding="async" loading="eager" />
      <span v-else class="text-xl font-bold text-slate-600">{{ siteInitial }}</span>
      <span class="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/60"></span>
    </div>

    <div class="min-w-0 flex-1 space-y-3 w-full">
      <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 break-words" :title="site?.name || site?.id || id">{{ site?.name || site?.id || id }}</h1>

      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-sm text-slate-500">
        <button class="flex items-center gap-1.5 group" @click="$emit('copy', site?.id || id)" title="Copy site ID">
          <svg class="h-4 w-4" viewBox="0 0 16 16" fill="currentColor"><path d="M5.75 3.5a.75.75 0 0 0-.75.75v.5h-1v-.5a2.25 2.25 0 0 1 2.25-2.25h4.5a2.25 2.25 0 0 1 2.25 2.25v.5h-1v-.5a.75.75 0 0 0-.75-.75h-4.5Z" /><path fill-rule="evenodd" d="M4.5 5.25A2.25 2.25 0 0 0 2.25 7.5v4.5A2.25 2.25 0 0 0 4.5 14.25h4.5A2.25 2.25 0 0 0 11.25 12V7.5A2.25 2.25 0 0 0 9 5.25h-4.5Zm.75 2.25a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z" clip-rule="evenodd" /></svg>
          <span class="font-mono text-xs group-hover:text-slate-800 transition-colors">{{ site?.id || id }}</span>
        </button>
        <span v-if="displayWebsiteUrl" class="hidden sm:inline text-slate-300">•</span>
        <a v-if="displayWebsiteUrl" :href="displayWebsiteUrl" target="_blank" class="flex items-center gap-1.5 hover:text-slate-800 transition-colors">
          <svg class="h-4 w-4" viewBox="0 0 16 16" fill="currentColor"><path d="M10.5 5.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z" /><path fill-rule="evenodd" d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM2.5 8a5.5 5.5 0 0 1 4.235-5.263.75.75 0 0 1 .765.765A4.003 4.003 0 0 0 9 8c0 .343.043.678.128 1a.75.75 0 0 1-.728.728A5.501 5.501 0 0 1 2.5 8Z" clip-rule="evenodd" /></svg>
          <span>Website</span>
        </a>
        <span v-if="displayGitUrl" class="hidden sm:inline text-slate-300">•</span>
        <a v-if="displayGitUrl" :href="displayGitUrl" target="_blank" class="flex items-center gap-1.5 hover:text-slate-800 transition-colors">
          <svg class="h-4 w-4" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M5 3.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm0 2.122a2.25 2.25 0 1 0-1.5 0v.878A2.25 2.25 0 0 0 5.75 8.5h1.5v2.128a2.251 2.251 0 1 0 1.5 0V8.5h1.5a2.25 2.25 0 0 0 2.25-2.25v-.878a2.25 2.25 0 1 0-1.5 0v.878a.75.75 0 0 1-.75.75h-4.5A.75.75 0 0 1 5 6.25v-.878Zm3.75 7.378a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm3-8.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clip-rule="evenodd"></path></svg>
          <span>Repo</span>
        </a>
      </div>

      <div class="flex items-center flex-wrap gap-2 pt-1">
        <span v-if="site" class="meta-tag"><span class="h-2 w-2 rounded-full bg-emerald-500"></span>{{ site.env }}</span>
        <span v-if="site" class="meta-tag" :title="`Renews in ${renewMonthName}`"><svg class="h-4 w-4" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M8 3a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0V5.06l-.97.97a.75.75 0 0 1-1.06-1.06l2.5-2.5a.75.75 0 0 1 1.06 0l2.5 2.5a.75.75 0 1 1-1.06 1.06l-.97-.97V8.25a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 8 3ZM5.24 7.74a4.5 4.5 0 1 1 5.52 0 .75.75 0 0 1-1.06-1.06 3 3 0 1 0-3.4 0 .75.75 0 1 1-1.06 1.06Z" clip-rule="evenodd" /></svg>Renew: {{ renewMonthName }}</span>
        <a v-if="latestCi?.run?.ci_url" :href="latestCi.run.ci_url" target="_blank" :class="['meta-tag', (latestCi.status||'').toLowerCase().includes('succ') || (latestCi.status||'').toLowerCase().includes('pass') ? 'ci-success' : (latestCi.status||'').toLowerCase().includes('fail') ? 'ci-failure' : (latestCi.status||'').toLowerCase().includes('run') ? 'ci-running' : '']">CI: {{ latestCi.status }}</a>
        <div v-if="displayContact" class="relative" data-popover-root>
          <button @click="toggleContactPopover" class="meta-tag">
            <svg class="h-4 w-4" viewBox="0 0 16 16" fill="currentColor"><path d="M10.5 5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z" /><path fill-rule="evenodd" d="M1.5 2h13A1.5 1.5 0 0 1 16 3.5v9A1.5 1.5 0 0 1 14.5 14h-13A1.5 1.5 0 0 1 0 12.5v-9A1.5 1.5 0 0 1 1.5 2ZM1.5 3a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-13Z" clip-rule="evenodd" /></svg>
            Contact
          </button>
          <Transition enter-active-class="transition ease-out duration-100" enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100" leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100" leave-to-class="transform opacity-0 scale-95">
            <div v-if="isContactOpen" class="absolute mt-2 w-72 rounded-xl bg-white shadow-lg ring-1 ring-black/5 p-4 z-10">
              <h4 class="font-semibold text-slate-800">Primary Contact</h4>
              <p class="text-sm text-slate-500 mb-4">{{ displayContact?.name || '—' }}</p>
              <div class="space-y-2 text-sm">
                <div v-if="displayContact?.email" class="flex items-center gap-2">
                  <svg class="h-4 w-4 flex-shrink-0 text-slate-400" viewBox="0 0 16 16" fill="currentColor"><path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v7A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 13.5 3h-11Zm10.254 1.254a.75.75 0 0 0-.932-.122L8 6.945l-3.822-2.813a.75.75 0 1 0-.814 1.226L7.42 8.44a.75.75 0 0 0 .932.122l4.25-3.125a.75.75 0 0 0-.122-.932Z" /></svg>
                  <a :href="`mailto:${displayContact.email}`" class="truncate text-slate-600 hover:text-slate-900">{{ displayContact.email }}</a>
                  <button class="ml-auto copy-btn" @click.stop="emit('copy', displayContact!.email!)">Copy</button>
                </div>
                <div v-if="displayContact?.phone" class="flex items-center gap-2">
                  <svg class="h-4 w-4 flex-shrink-0 text-slate-400" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M11.953 13.953a.75.75 0 0 1-1.06 0l-1.147-1.146a.75.75 0 0 0-1.06 0l-.82.819a1.5 1.5 0 0 1-2.122 0l-2.828-2.828a1.5 1.5 0 0 1 0-2.122l.82-.819a.75.75 0 0 0 0-1.06L2.047 4.107a.75.75 0 0 1 0-1.06l.89-.89a.75.75 0 1 1 1.06 1.06L3.52 3.69l.82.82a2.25 2.25 0 0 1 0 3.182l-1.061 1.06a.75.75 0 0 0 0 1.06l2.828 2.829a.75.75 0 0 0 1.06 0l1.06-1.061a2.25 2.25 0 0 1 3.182 0l.82.82 1.47-1.47a.75.75 0 1 1 1.06 1.06l-.89.89Z" clip-rule="evenodd" /></svg>
                  <span class="truncate text-slate-600">{{ displayContact.phone }}</span>
                  <button class="ml-auto copy-btn" @click.stop="emit('copy', displayContact!.phone!)">Copy</button>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <div class="w-full sm:w-auto sm:ml-auto flex items-center justify-end flex-shrink-0 gap-2">
      <NuxtLink to="/dashboard" class="action-link">← Back</NuxtLink>
      
      <div class="hidden sm:flex items-center gap-2">
        <a v-if="displayWebsiteUrl" :href="displayWebsiteUrl" target="_blank" class="btn-secondary">Open Site</a>
        <a v-if="displayGitUrl" :href="displayGitUrl" target="_blank" class="btn-primary">Open Repo</a>
      </div>
      
      <div class="sm:hidden relative" data-popover-root>
        <button @click="toggleActionMenu" class="mobile-action-btn" aria-label="More actions">
          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" /></svg>
        </button>
        <Transition enter-active-class="transition ease-out duration-100" enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100" leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100" leave-to-class="transform opacity-0 scale-95">
          <div v-if="isActionMenuOpen" class="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none z-10">
            <div class="py-1">
              <a v-if="displayWebsiteUrl" :href="displayWebsiteUrl" target="_blank" class="mobile-action-item">Open Site</a>
              <a v-if="displayGitUrl" :href="displayGitUrl" target="_blank" class="mobile-action-item">Open Repo</a>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.meta-tag {
  @apply inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700
         shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 transition-colors cursor-pointer;
}
.ci-success { @apply bg-emerald-50 text-emerald-800 ring-emerald-200; }
.ci-failure { @apply bg-rose-50 text-rose-800 ring-rose-200; }
.ci-running { @apply bg-amber-50 text-amber-800 ring-amber-200 animate-pulse; }

.copy-btn {
  @apply rounded-md px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200
         hover:bg-slate-100 hover:text-slate-900 transition-colors;
}

.action-link {
  @apply rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100
         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400;
}
.btn-secondary {
  @apply rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 bg-white
         shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 transition-colors
         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-500;
}
.btn-primary {
  @apply rounded-lg px-4 py-2 text-sm font-semibold text-white bg-slate-800
         shadow-sm ring-1 ring-slate-800 hover:bg-slate-700 transition-colors
         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-700;
}

.mobile-action-btn {
  @apply rounded-lg p-2 text-sm font-semibold text-slate-600 hover:bg-slate-100
         ring-1 ring-slate-200 bg-white shadow-sm
         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400;
}
.mobile-action-item {
  @apply block w-full px-4 py-2 text-left text-sm text-slate-700
         hover:bg-slate-100 hover:text-slate-900;
}
</style>