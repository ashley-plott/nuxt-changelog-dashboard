<script setup lang="ts">
const props = defineProps<{
  label: string
  active?: boolean
  count?: number | string
  icon?: string
}>()
const emit = defineEmits<{ (e:'click'): void }>()
</script>

<template>
  <button
    :aria-current="active ? 'page' : undefined"
    class="group relative px-4 py-2 rounded-xl text-sm transition flex items-center gap-2
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10
           "
    :class="active ? 'bg-white shadow-sm ring-1 ring-gray-200 text-gray-900' : 'text-gray-600 hover:bg-white/70'"
    @click="emit('click')"
  >
    <svg v-if="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path :d="icon"/></svg>
    <span>{{ label }}</span>
    <span v-if="typeof count !== 'undefined'" class="text-[10px] rounded-full bg-white/90 px-1.5 border border-black/5">{{ String(count) }}</span>
    <span v-if="active" class="absolute -bottom-1 left-3 right-3 h-0.5 rounded-full bg-gray-300"></span>
  </button>
</template>
