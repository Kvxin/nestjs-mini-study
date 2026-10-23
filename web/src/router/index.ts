import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import ProductsView from '../views/ProductsView.vue';
import ProductDetailView from '../views/ProductDetailView.vue';
import OrdersView from '../views/OrdersView.vue';
import OrderDetailView from '../views/OrderDetailView.vue';
import AdminProductsView from '../views/AdminProductsView.vue';
import PaymentView from '../views/PaymentView.vue';
import ProfileView from '../views/ProfileView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/register', name: 'register', component: RegisterView },
    { path: '/products', name: 'products', component: ProductsView },
    { path: '/products/:id', name: 'productDetail', component: ProductDetailView },
    { path: '/orders', name: 'orders', component: OrdersView, meta: { requiresAuth: true } },
    { path: '/orders/:id', name: 'orderDetail', component: OrderDetailView, meta: { requiresAuth: true } },
    { path: '/payments/:paymentId', name: 'payment', component: PaymentView, meta: { requiresAuth: true } },
    { path: '/profile', name: 'profile', component: ProfileView, meta: { requiresAuth: true } },
    { path: '/admin/products', name: 'adminProducts', component: AdminProductsView, meta: { requiresAuth: true, requiresAdmin: true } },
  ],
});

router.beforeEach((to) => {
  const hasToken = Boolean(localStorage.getItem('accessToken'));
  const userRaw = localStorage.getItem('authUser');
  const user = userRaw ? (JSON.parse(userRaw) as { role?: string }) : null;

  if (to.meta.requiresAuth && !hasToken) return { name: 'login' };
  if (to.meta.requiresAdmin && user?.role !== 'ADMIN') return { name: 'home' };
  return true;
});

export default router;
