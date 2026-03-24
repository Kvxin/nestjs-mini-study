<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-screen bg-slate-100 text-slate-800">
    <header class="bg-slate-900 text-white">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <h1 class="text-lg font-semibold">Vue 3 SPA Template</h1>
        <nav class="flex gap-4 text-sm">
          <RouterLink class="text-blue-100 hover:text-white" to="/">Home</RouterLink>
          <RouterLink class="text-blue-100 hover:text-white" to="/about">About</RouterLink>
        </nav>
      </div>
    </header>

    <main class="mx-auto max-w-5xl px-6 py-6">
      <RouterView />
    </main>
  </div>
</template>
