<template>
  <section class="panel">
    <span class="eyebrow">Phase 1 Shell</span>
    <h2>{{ title }}</h2>
    <p class="muted">{{ description }}</p>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
}>();
</script>
