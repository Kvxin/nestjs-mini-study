<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { api } from '../api';
import type { Order } from '../types';

const route = useRoute();
const order = ref<Order | null>(null);
const error = ref('');

onMounted(async () => {
  try {
    order.value = await api.orderDetail(route.params.id as string);
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? '订单详情加载失败';
  }
});
</script>

<template>
  <section class="card">
    <p v-if="error" class="text-sm text-rose-600">{{ error }}</p>
    <template v-else-if="order">
      <h1 class="text-xl font-semibold">订单 {{ order.orderNo }}</h1>
      <p class="mt-2 text-sm">状态：{{ order.status }} · 总额：¥{{ order.totalAmount }}</p>

      <h2 class="mt-4 text-base font-semibold">订单项</h2>
      <ul class="mt-2 space-y-2 text-sm">
        <li v-for="item in order.items" :key="item.id" class="rounded-xl border border-slate-200 p-3">
          <p>{{ item.product?.title || item.productId }} × {{ item.quantity }}</p>
          <p class="text-slate-500">单价 ¥{{ item.unitPrice }} / 小计 ¥{{ item.subtotal }}</p>
        </li>
      </ul>

      <div v-if="order.payment" class="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-3">
        <p class="text-sm">支付单：{{ order.payment.paymentNo }} · 状态：{{ order.payment.status }}</p>
        <div class="mt-2 flex gap-2">
          <RouterLink class="btn-primary" :to="`/payments/${order.payment.id}`">查看二维码</RouterLink>
          <a class="btn-secondary" :href="order.payment.payUrl" target="_blank" rel="noreferrer">打开支付确认页</a>
        </div>
      </div>
    </template>
  </section>
</template>
