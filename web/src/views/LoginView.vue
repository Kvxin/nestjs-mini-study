<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const email = ref('');
const password = ref('');
const error = ref('');

async function submit() {
  error.value = '';
  try {
    await auth.login(email.value, password.value);
    await router.push('/products');
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? '登录失败';
  }
}
</script>

<template>
  <section class="mx-auto max-w-md card">
    <h1 class="text-xl font-semibold">登录</h1>
    <form class="mt-4 space-y-3" @submit.prevent="submit">
      <input v-model="email" class="field" type="email" placeholder="邮箱" required>
      <input v-model="password" class="field" type="password" placeholder="密码" required>
      <p v-if="error" class="text-sm text-rose-600">{{ error }}</p>
      <button class="btn-primary w-full" :disabled="auth.loading">{{ auth.loading ? '登录中...' : '登录' }}</button>
    </form>
  </section>
</template>
