import { http } from './http';
import type { ApiEnvelope, AuthResult, Order, Payment, Product, UserProfile } from '../types';

function dataOf<T>(res: { data: ApiEnvelope<T> }): T {
  return res.data.data;
}

export const api = {
  register(payload: { email: string; password: string; deviceInfo?: string }) {
    return http.post<ApiEnvelope<AuthResult>>('/auth/register', payload).then(dataOf);
  },
  login(payload: { email: string; password: string; deviceInfo?: string }) {
    return http.post<ApiEnvelope<AuthResult>>('/auth/login', payload).then(dataOf);
  },
  refresh() {
    return http.post<ApiEnvelope<AuthResult>>('/auth/refresh', {}).then(dataOf);
  },
  logout(payload: { refreshToken?: string } = {}) {
    return http.post<ApiEnvelope<{ message: string }>>('/auth/logout', payload).then(dataOf);
  },
  me() {
    return http.get<ApiEnvelope<UserProfile>>('/users/me').then(dataOf);
  },
  listProducts() {
    return http.get<ApiEnvelope<Product[]>>('/products').then(dataOf);
  },
  productDetail(id: string) {
    return http.get<ApiEnvelope<Product>>(`/products/${id}`).then(dataOf);
  },
  createProduct(payload: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
    return http.post<ApiEnvelope<Product>>('/products', payload).then(dataOf);
  },
  updateProduct(id: string, payload: Partial<Product>) {
    return http.patch<ApiEnvelope<Product>>(`/products/${id}`, payload).then(dataOf);
  },
  deleteProduct(id: string) {
    return http.delete<ApiEnvelope<{ message: string }>>(`/products/${id}`).then(dataOf);
  },
  createOrder(payload: { items: { productId: string; quantity: number }[] }) {
    return http.post<ApiEnvelope<Order>>('/orders', payload).then(dataOf);
  },
  myOrders() {
    return http.get<ApiEnvelope<Order[]>>('/orders/me').then(dataOf);
  },
  orderDetail(id: string) {
    return http.get<ApiEnvelope<Order>>(`/orders/${id}`).then(dataOf);
  },
  paymentQrCode(paymentId: string) {
    return http.get<ApiEnvelope<Payment>>(`/payments/${paymentId}/qrcode`).then(dataOf);
  },
};
