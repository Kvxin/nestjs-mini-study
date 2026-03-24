<script setup lang="ts">
import { useCounterStore } from '../stores/counter'

const counter = useCounterStore()
</script>

<template>
  <section>
    <h2>Home</h2>
    <p>This is a Vue 3 + TypeScript + Pinia + Router starter.</p>

    <div class="counter">
      <p>Count: {{ counter.count }}</p>
      <p>Double count: {{ counter.doubleCount }}</p>
      <button type="button" @click="counter.increment">Increment</button>
    </div>
  </section>
</template>
