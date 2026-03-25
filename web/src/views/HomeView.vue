<template>
  <section class="grid gap-4 md:grid-cols-3">
    <article class="card md:col-span-2">
      <h1 class="text-2xl font-semibold">NestJS 电商前端控制台</h1>
      <p class="mt-3 text-sm text-slate-600">
        本前端覆盖认证、商品浏览、管理员商品管理、下单、订单查询、支付二维码查看等完整流程。
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <RouterLink class="btn-primary" to="/products">开始购物</RouterLink>
        <RouterLink class="btn-secondary" to="/orders">查看订单</RouterLink>
      </div>
    </article>

    <article class="card">
      <h2 class="text-base font-semibold">后端路由覆盖</h2>
      <ul class="mt-2 space-y-1 text-sm text-slate-600">
        <li>✓ /auth/register /auth/login /auth/refresh /auth/logout</li>
        <li>✓ /users/me</li>
        <li>✓ /products 全部 CRUD（管理员）</li>
        <li>✓ /orders 创建、列表、详情</li>
        <li>✓ /payments/:paymentId/qrcode</li>
      </ul>
    </article>
  </section>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>
