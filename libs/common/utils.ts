/**
 * 通用工具函数
 * 
 * 这个文件提供项目中通用的工具函数
 * 目前包含 Decimal 类型转换函数
 * 
 * @module libs/common/utils
 */

import { Decimal } from '@prisma/client/runtime/library';

/**
 * 将 Decimal 类型转换为数字
 * 
 * 作用：Prisma 的 Decimal 类型不能直接用于 JSON 序列化，需要转换为普通数字
 * 
 * @param value - 可能是 Decimal、number 或 string 类型的值
 * @returns number - 转换后的数字
 * 
 * 使用场景：
 * 
 * 1. Prisma 查询返回的数据（见 apps/product-service/src/product.service.ts:138）
 *    ```typescript
 *    // Prisma 返回的 product.price 是 Decimal 类型
 *    return {
 *      ...product,
 *      price: decimalToNumber(product.price),  // 转换为 number
 *    };
 *    ```
 * 
 * 2. 订单金额处理（见 apps/order-service/src/order.service.ts:154）
 *    ```typescript
 *    return {
 *      ...order,
 *      totalAmount: decimalToNumber(order.totalAmount),
 *    };
 *    ```
 * 
 * 3. 支付金额处理（见 apps/payment-service/src/payment.service.ts:130）
 *    ```typescript
 *    return {
 *      ...payment,
 *      amount: decimalToNumber(payment.amount),
 *    };
 *    ```
 * 
 * 为什么需要这个函数：
 * 
 * Prisma 使用 Decimal 类型来精确表示小数（避免浮点数精度问题）
 * 例如：0.1 + 0.2 在 JavaScript 中等于 0.30000000000000004
 * 
 * 但 Decimal 对象不能直接序列化：
 * ```typescript
 * const price = new Decimal(19.99);
 * JSON.stringify(price);  // 不会得到期望的结果
 * ```
 * 
 * 所以需要在返回给前端之前转换为普通数字
 */
export function decimalToNumber(value: Decimal | number | string) {
  // 如果是 Decimal 实例，使用 toNumber() 方法转换
  if (value instanceof Decimal) {
    return value.toNumber();
  }

  // 如果已经是 number 或 string，直接转为 number
  return Number(value);
}
