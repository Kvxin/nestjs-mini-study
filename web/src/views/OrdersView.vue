<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '../api';
import { useCartStore } from '../stores/cart';
import type { Order } from '../types';

const cart = useCartStore();
const orders = ref<Order[]>([]);
const loading = ref(false);
const message = ref('');
const error = ref('');

async function loadOrders() {
  loading.value = true;
  try {
    orders.value = await api.myOrders();
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? '订单加载失败';
  } finally {
    loading.value = false;
  }
}

async function createOrderFromCart() {
  message.value = '';
  error.value = '';
  if (!cart.items.length) {
    error.value = '购物车为空';
    return;
  }
  try {
    const order = await api.createOrder({
      items: cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    });
    cart.clear();
    message.value = `下单成功：${order.orderNo}`;
    await loadOrders();
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? '下单失败';
  }
}

onMounted(loadOrders);
</script>

<template>
  <section class="grid gap-4 lg:grid-cols-3">
    <article class="card lg:col-span-1">
      <h2 class="text-lg font-semibold">购物车结算</h2>
      <div class="mt-3 space-y-2 text-sm">
        <div v-for="item in cart.items" :key="item.productId" class="rounded-xl border border-slate-200 p-2">
          <p class="font-medium">{{ item.title }}</p>
          <div class="mt-1 flex items-center justify-between">
            <span>¥{{ item.price }}</span>
            <input
              class="field w-24"
              type="number"
              min="1"
              :value="item.quantity"
              @change="cart.updateQuantity(item.productId, Number(($event.target as HTMLInputElement).value))"
            >
          </div>
        </div>
      </div>
      <p class="mt-3 text-sm font-medium">合计：¥{{ cart.totalAmount }}</p>
      <button class="btn-primary mt-3 w-full" @click="createOrderFromCart">调用 POST /orders 下单</button>
      <p v-if="message" class="mt-2 text-sm text-emerald-600">{{ message }}</p>
      <p v-if="error" class="mt-2 text-sm text-rose-600">{{ error }}</p>
    </article>

    <article class="card lg:col-span-2">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-lg font-semibold">我的订单（GET /orders/me）</h2>
        <button class="btn-secondary" @click="loadOrders">刷新</button>
      </div>
      <p v-if="loading" class="text-sm text-slate-500">加载中...</p>
      <div class="space-y-2">
        <div v-for="order in orders" :key="order.id" class="rounded-xl border border-slate-200 p-3 text-sm">
          <div class="flex items-center justify-between">
            <p class="font-medium">{{ order.orderNo }}</p>
            <RouterLink class="btn-secondary" :to="`/orders/${order.id}`">详情</RouterLink>
          </div>
          <p class="mt-1">状态：{{ order.status }} · 总额：¥{{ order.totalAmount }}</p>
        </div>
      </div>
    </article>
  </section>
</template>
