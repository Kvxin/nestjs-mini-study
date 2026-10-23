<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../api';
import { useCartStore } from '../stores/cart';
import type { Product } from '../types';

const route = useRoute();
const cart = useCartStore();
const product = ref<Product | null>(null);
const error = ref('');

onMounted(async () => {
  try {
    product.value = await api.productDetail(route.params.id as string);
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? '商品详情加载失败';
  }
});
</script>

<template>
  <section class="card">
    <p v-if="error" class="text-sm text-rose-600">{{ error }}</p>
    <template v-else-if="product">
      <img v-if="product.coverUrl" :src="product.coverUrl" :alt="product.title" class="mb-4 h-64 w-full rounded-xl object-cover">
      <h1 class="text-2xl font-semibold">{{ product.title }}</h1>
      <p class="mt-3 text-sm text-slate-600">{{ product.description || '暂无描述' }}</p>
      <p class="mt-3">价格：¥{{ product.price }} | 库存：{{ product.stock }} | 状态：{{ product.status }}</p>
      <button class="btn-primary mt-4" @click="cart.addProduct(product)">加入购物车</button>
    </template>
  </section>
</template>
