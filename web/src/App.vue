<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
</script>

<template>
  <header class="header">
    <h1 class="text-3xl font-bold underline">Hello world!</h1>
    <h1>Vue 3 SPA Template</h1>
    <nav class="nav">
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/about">About</RouterLink>
    </nav>
  </header>

  <main class="container">
    <RouterView />
  </main>
</template>
