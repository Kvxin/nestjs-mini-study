export type UserRole = 'USER' | 'ADMIN';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  status?: string;
  createdAt?: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

export interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  stock: number;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  coverUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Payment {
  id: string;
  paymentNo: string;
  orderId: string;
  amount: number;
  status: string;
  payUrl: string;
  qrCodeData: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product?: Product;
}

export interface Order {
  id: string;
  orderNo: string;
  userId: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  payment?: Payment;
}
