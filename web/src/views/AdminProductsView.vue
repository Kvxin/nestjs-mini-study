<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { api } from '../api';
import type { Product } from '../types';

const products = ref<Product[]>([]);
const message = ref('');
const error = ref('');
const editingId = ref<string | null>(null);

const form = reactive({
  title: '',
  description: '',
  price: 0,
  stock: 0,
  status: 'ACTIVE' as Product['status'],
  coverUrl: '',
});

function resetForm() {
  editingId.value = null;
  form.title = '';
  form.description = '';
  form.price = 0;
  form.stock = 0;
  form.status = 'ACTIVE';
  form.coverUrl = '';
}

async function loadProducts() {
  products.value = await api.listProducts();
}

function startEdit(p: Product) {
  editingId.value = p.id;
  form.title = p.title;
  form.description = p.description ?? '';
  form.price = p.price;
  form.stock = p.stock;
  form.status = p.status;
  form.coverUrl = p.coverUrl ?? '';
}

async function submit() {
  message.value = '';
  error.value = '';
  try {
    const payload = {
      title: form.title,
      description: form.description || undefined,
      price: Number(form.price),
      stock: Number(form.stock),
      status: form.status,
      coverUrl: form.coverUrl || undefined,
    };
    if (editingId.value) {
      await api.updateProduct(editingId.value, payload);
      message.value = 'PATCH /products/:id 成功';
    } else {
      await api.createProduct(payload);
      message.value = 'POST /products 成功';
    }
    resetForm();
    await loadProducts();
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? '保存失败（需要 ADMIN）';
  }
}

async function remove(id: string) {
  try {
    await api.deleteProduct(id);
    message.value = 'DELETE /products/:id 成功';
    await loadProducts();
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? '删除失败';
  }
}

onMounted(async () => {
  try {
    await loadProducts();
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? '商品管理页加载失败';
  }
});
</script>

<template>
  <section class="grid gap-4 lg:grid-cols-3">
    <article class="card lg:col-span-1">
      <h1 class="text-lg font-semibold">管理员商品 CRUD</h1>
      <form class="mt-3 space-y-2" @submit.prevent="submit">
        <input v-model="form.title" class="field" required placeholder="标题">
        <textarea v-model="form.description" class="field" rows="2" placeholder="描述" />
        <input v-model.number="form.price" class="field" type="number" min="0" required placeholder="价格">
        <input v-model.number="form.stock" class="field" type="number" min="0" required placeholder="库存">
        <select v-model="form.status" class="field">
          <option value="DRAFT">DRAFT</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
        <input v-model="form.coverUrl" class="field" placeholder="封面URL（可选）">
        <div class="flex gap-2">
          <button class="btn-primary" type="submit">{{ editingId ? '更新' : '创建' }}</button>
          <button class="btn-secondary" type="button" @click="resetForm">重置</button>
        </div>
      </form>
      <p v-if="message" class="mt-2 text-sm text-emerald-600">{{ message }}</p>
      <p v-if="error" class="mt-2 text-sm text-rose-600">{{ error }}</p>
    </article>

    <article class="card lg:col-span-2">
      <h2 class="text-base font-semibold">商品列表（GET /products）</h2>
      <div class="mt-3 space-y-2">
        <div v-for="p in products" :key="p.id" class="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm">
          <p>{{ p.title }} · ¥{{ p.price }} · 库存 {{ p.stock }} · {{ p.status }}</p>
          <div class="flex gap-2">
            <button class="btn-secondary" @click="startEdit(p)">编辑</button>
            <button class="btn-secondary" @click="remove(p.id)">删除</button>
          </div>
        </div>
      </div>
    </article>
  </section>
</template>
