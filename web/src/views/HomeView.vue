<script setup lang="ts">
import { useCounterStore } from '../stores/counter'

const counter = useCounterStore()
</script>

<template>
  <section class="space-y-4">
    <h2 class="text-2xl font-bold">Home</h2>
    <p class="text-slate-600">This is a Vue 3 + TypeScript + Pinia + Router starter.</p>

    <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p>Count: {{ counter.count }}</p>
      <p>Double count: {{ counter.doubleCount }}</p>
      <button
        type="button"
        class="mt-3 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        @click="counter.increment"
      >
        Increment
      </button>
    </div>
  </section>
</template>
