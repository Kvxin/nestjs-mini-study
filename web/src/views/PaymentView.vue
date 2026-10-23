<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../api';
import type { Payment } from '../types';

const route = useRoute();
const payment = ref<Payment | null>(null);
const error = ref('');

async function loadPayment() {
  try {
    payment.value = await api.paymentQrCode(route.params.paymentId as string);
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? '支付二维码加载失败';
  }
}

onMounted(loadPayment);
</script>

<template>
  <section class="card">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-semibold">支付二维码</h1>
      <button class="btn-secondary" @click="loadPayment">刷新</button>
    </div>
    <p v-if="error" class="text-sm text-rose-600">{{ error }}</p>
    <template v-else-if="payment">
      <p class="text-sm">支付单号：{{ payment.paymentNo }} · 状态：{{ payment.status }} · 金额：¥{{ payment.amount }}</p>
      <img :src="payment.qrCodeData" alt="payment qrcode" class="mx-auto mt-4 h-64 w-64 rounded-xl border border-slate-200 bg-white p-2">
      <a :href="payment.payUrl" target="_blank" rel="noreferrer" class="btn-primary mt-4">打开支付确认页面（payment-service）</a>
    </template>
  </section>
</template>
