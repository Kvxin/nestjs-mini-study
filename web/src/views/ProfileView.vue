<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const message = ref('');

onMounted(async () => {
  await auth.fetchMe();
});

async function refreshToken() {
  const ok = await auth.refreshByCookie();
  message.value = ok ? '刷新 access token 成功' : '刷新失败，请重新登录';
}
</script>

<template>
  <section class="card">
    <h1 class="text-xl font-semibold">我的账号</h1>
    <div class="mt-4 space-y-1 text-sm">
      <p><span class="text-slate-500">ID：</span>{{ auth.user?.id }}</p>
      <p><span class="text-slate-500">邮箱：</span>{{ auth.user?.email }}</p>
      <p><span class="text-slate-500">角色：</span>{{ auth.user?.role }}</p>
      <p><span class="text-slate-500">状态：</span>{{ auth.user?.status ?? '-' }}</p>
    </div>
    <div class="mt-4">
      <button class="btn-secondary" @click="refreshToken">测试 /auth/refresh</button>
      <p v-if="message" class="mt-2 text-sm text-slate-600">{{ message }}</p>
    </div>
  </section>
</template>
