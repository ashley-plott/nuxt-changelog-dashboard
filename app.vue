<script setup lang="ts">
// Apply the 'auth' middleware globally
definePageMeta({ layout: false, middleware: 'guest' })
</script>

<template>
  <NuxtPage />
</template>
