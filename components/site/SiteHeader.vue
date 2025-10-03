<script setup lang="ts">
import { computed, ref } from 'vue'
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
  const raw = props.displayWebsiteUrl
  try { return raw ? new URL(raw).hostname : '' } catch { return '' }
})
const favPrimary  = computed(() => siteHostname.value ? `https://www.google.com/s2/favicons?sz=64&domain=${siteHostname.value}` : '')
const favFallback = computed(() => siteHostname.value ? `https://icons.duckduckgo.com/ip3/${siteHostname.value}.ico` : '')
const favTriedFallback = ref(false); const favHide = ref(false)
function onFavError(){ if(!favTriedFallback.value) favTriedFallback.value = true; else favHide.value = true }

const displayContact = computed<PrimaryContact | null>(() => props.site?.primaryContact || null)
</script>

<template>
  <div class="flex items-start gap-4">
    <!-- Brand / favicon -->
    <div class="relative h-12 w-12 sm:h-14 sm:w-14 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 bg-gradient-to-br from-white to-gray-50 flex items-center justify-center">
      <img v-if="siteHostname && !favHide" :src="favTriedFallback ? favFallback : favPrimary" @error="onFavError" :alt="site?.name || site?.id || 'Site'" class="h-7 w-7 sm:h-8 sm:w-8 object-contain" decoding="async" loading="eager" />
      <span v-else class="text-sm sm:text-base font-semibold text-gray-700">{{ siteInitial }}</span>
      <span class="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/60"></span>
    </div>

    <!-- Title & meta -->
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2 flex-wrap">
        <h1 class="text-[20px] sm:text-2xl md:text-3xl font-semibold tracking-tight text-gray-900 truncate">{{ site?.name || site?.id || id }}</h1>

        <span v-if="site" class="inline-flex items-center gap-1 rounded-full border border-black/5 bg-gray-50 px-2.5 py-1 text-xs text-gray-700">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          {{ site.env }}
        </span>

        <span v-if="site" class="inline-flex items-center gap-1 rounded-full border border-black/5 bg-gray-50 px-2.5 py-1 text-xs text-gray-700" :title="`Renews in ${renewMonthName}`">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9"/><path d="M21 3v6h-6"/></svg>
          Renew: {{ renewMonthName }}
        </span>

        <!-- Contact -->
        <div v-if="displayContact?.name || displayContact?.email || displayContact?.phone" class="relative">
          <details class="group inline-block">
            <summary class="list-none inline-flex items-center gap-1 rounded-full border border-black/5 bg-white/60 px-2.5 py-1 text-xs text-gray-700 cursor-pointer hover:shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92V21a2 2 0 0 1-2.18 2A19.72 19.72 0 0 1 3 5.18 2 2 0 0 1 5 3h4.09a2 2 0 0 1 2 1.72l.57 3.42a2 2 0 0 1-.55 1.86L9.91 12a16 16 0 0 0 6.18 6.18l2-1.2a2 2 0 0 1 1.86-.55l3.42.57A2 2 0 0 1 22 16.92z"/></svg>
              Contact
            </summary>
            <div class="absolute mt-2 w-72 sm:w-80 rounded-xl border border-black/5 bg-white shadow-md p-3 z-10">
              <div class="flex items-start gap-3">
                <div class="h-9 w-9 rounded-lg bg-gray-50 border flex items-center justify-center">
                  <span class="text-sm font-semibold">{{ (displayContact?.name || (displayContact?.email || displayContact?.phone || '?')).slice(0,1).toUpperCase() }}</span>
                </div>
                <div class="min-w-0">
                  <div class="font-medium truncate">{{ displayContact?.name || '—' }}</div>
                  <div class="mt-1 space-y-1 text-sm">
                    <div v-if="displayContact?.email" class="flex items-center justify-between gap-2">
                      <a :href="`mailto:${displayContact.email}`" class="truncate hover:underline underline-offset-2">{{ displayContact.email }}</a>
                      <button class="rounded border px-2 py-1 text-[11px] hover:bg-gray-50" @click.stop="emit('copy', displayContact.email!)">Copy</button>
                    </div>
                    <div v-if="displayContact?.phone" class="flex items-center justify-between gap-2">
                      <a :href="`tel:${displayContact.phone}`" class="truncate hover:underline underline-offset-2">{{ displayContact.phone }}</a>
                      <button class="rounded border px-2 py-1 text-[11px] hover:bg-gray-50" @click.stop="emit('copy', displayContact.phone!)">Copy</button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="mt-3 grid grid-cols-2 gap-2">
                <a v-if="displayContact?.email" :href="`mailto:${displayContact.email}`" class="inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">Email</a>
                <a v-if="displayContact?.phone" :href="`tel:${displayContact.phone}`" class="inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">Call</a>
              </div>
            </div>
          </details>
        </div>
      </div>

      <p class="mt-1 text-xs sm:text-[13px] text-gray-600 truncate flex items-center gap-2">
        <button class="underline decoration-dotted underline-offset-2 hover:text-gray-900" @click="$emit('copy', site?.id || id)" title="Copy site ID">{{ site?.id || id }}</button>
        <span v-if="displayWebsiteUrl" class="text-gray-300">•</span>
        <a v-if="displayWebsiteUrl" :href="displayWebsiteUrl" target="_blank" class="hover:underline underline-offset-2 hover:text-gray-900">Website</a>
        <span v-if="displayGitUrl" class="text-gray-300">•</span>
        <a v-if="displayGitUrl" :href="displayGitUrl" target="_blank" class="hover:underline underline-offset-2 hover:text-gray-900">Repo</a>
      </p>
    </div>

    <!-- Actions -->
    <div class="ml-auto flex flex-wrap items-center gap-2">
      <NuxtLink to="/dashboard" class="inline-flex items-center rounded-xl border border-black/5 bg-white px-3 py-1.5 text-sm shadow-sm hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10">← Back</NuxtLink>
      <a v-if="displayWebsiteUrl" :href="displayWebsiteUrl" target="_blank" class="inline-flex items-center rounded-xl border border-black/5 bg-white px-3 py-1.5 text-sm shadow-sm hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10">Open site</a>
      <a v-if="displayGitUrl" :href="displayGitUrl" target="_blank" class="inline-flex items-center rounded-xl border border-black/5 bg-white px-3 py-1.5 text-sm shadow-sm hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10">Open repo</a>
      <a v-if="latestCi?.run?.ci_url" :href="latestCi.run.ci_url" target="_blank"
         :class="['inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs shadow-sm',
                  (latestCi.status||'').toLowerCase()==='success'||(latestCi.status||'').toLowerCase()==='passed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  (latestCi.status||'').toLowerCase()==='failure'||(latestCi.status||'').toLowerCase()==='failed' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                  (latestCi.status||'').toLowerCase()==='running' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                  'bg-gray-50 text-gray-700 border-gray-200'
         ]"><span class="hidden sm:inline">CI:</span> {{ latestCi.status }}</a>
    </div>
  </div>
</template>
