export const CLIENT_TOKENS = {
  USER_SERVICE: 'USER_SERVICE',
  PRODUCT_SERVICE: 'PRODUCT_SERVICE',
  ORDER_SERVICE: 'ORDER_SERVICE',
  PAYMENT_SERVICE: 'PAYMENT_SERVICE',
} as const;

export const USER_PATTERNS = {
  REGISTER: 'user.register',
  LOGIN: 'user.login',
  REFRESH_TOKEN: 'user.refresh-token',
  LOGOUT: 'user.logout',
  GET_PROFILE: 'user.get-profile',
} as const;

export const PRODUCT_PATTERNS = {
  CREATE: 'product.create',
  UPDATE: 'product.update',
  DELETE: 'product.delete',
  FIND_ONE: 'product.find-one',
  LIST: 'product.list',
  CHECK_AND_RESERVE_STOCK: 'product.check-and-reserve-stock',
  RELEASE_STOCK: 'product.release-stock',
} as const;

export const ORDER_PATTERNS = {
  CREATE: 'order.create',
  FIND_ONE: 'order.find-one',
  FIND_MINE: 'order.find-mine',
  FIND_ALL: 'order.find-all',
  MARK_PAID: 'order.mark-paid',
} as const;

export const PAYMENT_PATTERNS = {
  CREATE_FOR_ORDER: 'payment.create-for-order',
  FIND_BY_ID: 'payment.find-by-id',
  FIND_BY_NO: 'payment.find-by-no',
  CONFIRM_SUCCESS: 'payment.confirm-success',
} as const;

export type JwtUserRole = 'USER' | 'ADMIN';

export interface JwtPayload {
  sub: string;
  email: string;
  role: JwtUserRole;
}
