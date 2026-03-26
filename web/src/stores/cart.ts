import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { Product } from '../types';

interface CartItem {
  productId: string;
  title: string;
  price: number;
  quantity: number;
}

const CART_KEY = 'cartItems';

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([]);

  const totalAmount = computed(() => items.value.reduce((sum, item) => sum + item.price * item.quantity, 0));

  function hydrate() {
    const raw = localStorage.getItem(CART_KEY);
    items.value = raw ? (JSON.parse(raw) as CartItem[]) : [];
  }

  function persist() {
    localStorage.setItem(CART_KEY, JSON.stringify(items.value));
  }

  function addProduct(product: Product) {
    const existing = items.value.find((item) => item.productId === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      items.value.push({
        productId: product.id,
        title: product.title,
        price: product.price,
        quantity: 1,
      });
    }
    persist();
  }

  function updateQuantity(productId: string, quantity: number) {
    const target = items.value.find((item) => item.productId === productId);
    if (!target) return;
    if (quantity <= 0) {
      remove(productId);
      return;
    }
    target.quantity = quantity;
    persist();
  }

  function remove(productId: string) {
    items.value = items.value.filter((item) => item.productId !== productId);
    persist();
  }

  function clear() {
    items.value = [];
    persist();
  }

  return { items, totalAmount, hydrate, addProduct, updateQuantity, remove, clear };
});
