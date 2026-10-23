<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { RouterLink, RouterView, useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';
import { useCartStore } from './stores/cart';

const auth = useAuthStore();
const cart = useCartStore();
const router = useRouter();

const cartCount = computed(() => cart.items.reduce((sum, item) => sum + item.quantity, 0));

onMounted(async () => {
  auth.hydrate();
  cart.hydrate();
  if (!auth.isAuthenticated) {
    await auth.refreshByCookie();
  } else {
    await auth.fetchMe().catch(() => auth.clear());
  }
});

async function handleLogout() {
  await auth.logout();
  cart.clear();
  await router.push('/login');
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 text-slate-800">
    <header class="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <RouterLink to="/" class="text-lg font-semibold text-indigo-600">Mini Commerce</RouterLink>
        <nav class="flex flex-wrap items-center gap-2 text-sm">
          <RouterLink class="nav-link" to="/products">商品</RouterLink>
          <RouterLink v-if="auth.isAuthenticated" class="nav-link" to="/orders">订单</RouterLink>
          <RouterLink v-if="auth.isAuthenticated" class="nav-link" to="/profile">我的账号</RouterLink>
          <RouterLink v-if="auth.isAdmin" class="nav-link" to="/admin/products">商品管理</RouterLink>
          <span class="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">购物车 {{ cartCount }}</span>
          <RouterLink v-if="!auth.isAuthenticated" class="nav-link" to="/login">登录</RouterLink>
          <RouterLink v-if="!auth.isAuthenticated" class="nav-link" to="/register">注册</RouterLink>
          <button v-if="auth.isAuthenticated" class="btn-secondary" @click="handleLogout">登出</button>
        </nav>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-6">
      <RouterView />
    </main>
  </div>
</template>
