<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '../api';
import { useCartStore } from '../stores/cart';
import type { Product } from '../types';

const products = ref<Product[]>([]);
const loading = ref(false);
const error = ref('');
const cart = useCartStore();

async function loadProducts() {
  loading.value = true;
  error.value = '';
  try {
    products.value = await api.listProducts();
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? '商品加载失败';
  } finally {
    loading.value = false;
  }
}

onMounted(loadProducts);
</script>

<template>
  <section>
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-semibold">商品列表</h1>
      <button class="btn-secondary" @click="loadProducts">刷新</button>
    </div>

    <p v-if="error" class="mb-3 text-sm text-rose-600">{{ error }}</p>
    <p v-if="loading" class="text-sm text-slate-500">加载中...</p>

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <article v-for="p in products" :key="p.id" class="card">
        <img v-if="p.coverUrl" :src="p.coverUrl" :alt="p.title" class="h-40 w-full rounded-xl object-cover">
        <h2 class="mt-3 text-base font-semibold">{{ p.title }}</h2>
        <p class="mt-1 line-clamp-2 text-sm text-slate-600">{{ p.description || '暂无描述' }}</p>
        <p class="mt-2 text-sm">¥{{ p.price }} · 库存 {{ p.stock }} · {{ p.status }}</p>
        <div class="mt-3 flex gap-2">
          <button class="btn-primary" @click="cart.addProduct(p)">加入购物车</button>
          <RouterLink class="btn-secondary" :to="`/products/${p.id}`">详情</RouterLink>
        </div>
      </article>
    </div>
  </section>
</template>
