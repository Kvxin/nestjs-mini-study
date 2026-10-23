/**
 * 订单服务 - 核心业务逻辑
 * 
 * 作用：处理订单相关的所有业务逻辑
 * 包括：创建订单、查询订单、更新订单状态
 * 
 * 这个服务运行在独立的微服务进程中（端口 3003）
 * 通过 TCP 与 API Gateway、产品服务、支付服务通信
 * 
 * @module apps/order-service/src/order.service
 */

import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { ClientProxy } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../../libs/prisma/prisma.service';
import {
  CLIENT_TOKENS,
  PAYMENT_PATTERNS,
  PRODUCT_PATTERNS,
} from '../../../libs/contracts/messages';
import { requestFromClient, rpcError } from '../../../libs/common/rpc';
import { decimalToNumber } from '../../../libs/common/utils';

/**
 * 订单服务类
 * 
 * @Injectable() 装饰器：
 * - 标记这个类可以被依赖注入
 * - NestJS 会自动创建实例并注入依赖
 * 
 * 依赖注入：
 * - PrismaService: 数据库操作
 * - PRODUCT_SERVICE: 产品服务客户端（用于库存操作）
 * - PAYMENT_SERVICE: 支付服务客户端（用于创建支付）
 */
@Injectable()
export class OrderServiceService {
  /**
   * 构造函数注入依赖
   * 
   * 依赖说明：
   * - prisma: 数据库客户端
   * - productClient: 产品服务客户端，用于检查和预扣库存
   * - paymentClient: 支付服务客户端，用于创建支付记录
   * 
   * @Inject(CLIENT_TOKENS.PRODUCT_SERVICE):
   * - 使用令牌注入特定的微服务客户端
   * - CLIENT_TOKENS.PRODUCT_SERVICE = 'PRODUCT_SERVICE'
   */
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(CLIENT_TOKENS.PRODUCT_SERVICE)
    private readonly productClient: ClientProxy,
    @Inject(CLIENT_TOKENS.PAYMENT_SERVICE)
    private readonly paymentClient: ClientProxy,
  ) {}

  // ============ 创建订单 ============

  /**
   * 创建订单
   * 
   * 这是整个电商系统最复杂的方法，涉及多个服务的协调：
   * 1. 调用产品服务：检查并预扣库存
   * 2. 创建订单记录
   * 3. 调用支付服务：创建支付记录
   * 4. 关联订单和支付
   * 5. 如果任何步骤失败，释放库存
   * 
   * @param payload - 包含用户 ID 和商品列表
   * @returns 订单详情和支付信息
   * 
   * 调用链路：
   * 1. 用户请求：POST /api/orders
   * 2. API Gateway: apps/api-gateway/src/orders/orders.controller.ts:32
   * 3. TCP 传输 -> 订单服务控制器：apps/order-service/src/order.controller.ts:14
   * 4. 订单服务：这里的方法
   * 
   * 分布式事务：
   * - 使用补偿事务模式（Saga 模式）
   * - 如果订单创建失败，调用 releaseStock 释放库存
   */
  async create(payload: {
    userId: string;
    items: Array<{ productId: string; quantity: number }>;
  }) {
    /**
     * 步骤 1: 检查并预扣库存
     * 
     * requestFromClient:
     * - 发送 TCP 请求到产品服务
     * - 将 RPC 异常转换为 HTTP 异常
     * 
     * PRODUCT_PATTERNS.CHECK_AND_RESERVE_STOCK:
     * - 消息模式：'product.check-and-reserve-stock'
     * - 产品服务会监听这个模式并处理
     * 
     * 返回数据：
     * - items: 商品快照数组（标题、价格、数量、小计）
     * - totalAmount: 总金额
     * 
     * 如果库存不足或商品不可用，这里会抛出异常，后续步骤不会执行
     */
    const reserved = await requestFromClient<{
      items: Array<{
        productId: string;
        snapshotTitle: string;
        snapshotPrice: number;
        quantity: number;
        subtotal: number;
      }>;
      totalAmount: number;
    }>(
      this.productClient.send(PRODUCT_PATTERNS.CHECK_AND_RESERVE_STOCK, {
        items: payload.items,
      }),
    );

    /**
     * 生成订单号
     * 
     * 订单号格式：ORD-{时间戳}-{UUID 前 8 位}
     * 示例：ORD-1704067200000-A1B2C3D4
     * 
     * 为什么不用数据库自增 ID：
     * - 对用户更友好（有意义的编号）
     * - 分布式系统友好（不依赖数据库）
     * - 防止泄露业务信息（订单量）
     */
    const orderNo = this.generateOrderNo();

    /**
     * try-catch 块：处理分布式事务
     * 
     * 尝试执行：
     * 1. 创建订单
     * 2. 创建支付
     * 3. 关联订单和支付
     * 
     * 如果任何步骤失败：
     * - 捕获异常
     * - 释放库存（补偿操作）
     * - 重新抛出异常
     */
    try {
      /**
       * 步骤 2: 创建订单记录
       * 
       * Prisma 方法：create with nested create
       * - 创建订单的同时创建关联的订单项
       * 
       * data 结构：
       * - orderNo: 订单号
       * - userId: 用户 ID
       * - totalAmount: 总金额（使用 Prisma.Decimal 确保精度）
       * - items: 嵌套创建，使用上一步返回的商品快照
       * 
       * include: { items: true }:
       * - 同时返回关联的订单项数据
       */
      const order = await this.prisma.order.create({
        data: {
          orderNo,
          userId: payload.userId,
          totalAmount: new Prisma.Decimal(reserved.totalAmount),
          items: {
            create: reserved.items.map((item) => ({
              productId: item.productId,
              snapshotTitle: item.snapshotTitle,
              snapshotPrice: new Prisma.Decimal(item.snapshotPrice),
              quantity: item.quantity,
              subtotal: new Prisma.Decimal(item.subtotal),
            })),
          },
        },
        include: { items: true },
      });

      /**
       * 步骤 3: 创建支付记录
       * 
       * 调用支付服务，创建支付记录
       * 
       * PAYMENT_PATTERNS.CREATE_FOR_ORDER:
       * - 消息模式：'payment.create-for-order'
       * - 支付服务会监听这个模式并处理
       * 
       * 传递数据：
       * - orderId: 订单 ID，用于关联
       * - orderNo: 订单号，用于显示
       * - amount: 支付金额
       * 
       * 返回数据：
       * - id: 支付记录 ID
       * - paymentNo: 支付号
       * - status: 支付状态（CREATED）
       * - payUrl: 支付页面 URL
       * - qrCodeData: 二维码数据（Base64）
       */
      const payment = await requestFromClient<{
        id: string;
        paymentNo: string;
        status: string;
        payUrl: string;
        qrCodeData: string;
      }>(
        this.paymentClient.send(PAYMENT_PATTERNS.CREATE_FOR_ORDER, {
          orderId: order.id,
          orderNo: order.orderNo,
          amount: reserved.totalAmount,
        }),
      );

      /**
       * 步骤 4: 关联订单和支付
       * 
       * 更新订单，添加 paymentId 外键
       * 
       * 为什么分两步：
       * - 因为 payment 在 order 之后创建
       * - 创建 order 时还没有 paymentId
       * 
       * Prisma 关系：
       * - Order 与 Payment 是一对一关系
       * - paymentId 是外键，有唯一约束
       */
      const updatedOrder = await this.prisma.order.update({
        where: { id: order.id },
        data: { paymentId: payment.id },
        include: { items: true },
      });

      /**
       * 返回订单和支付信息
       * 
       * mapOrder: 转换订单数据格式（Decimal 转 number）
       * 
       * 前端收到后：
       * - 显示订单详情
       * - 显示支付二维码
       * - 提供支付链接
       */
      return {
        ...this.mapOrder(updatedOrder),
        payment,
      };
    } catch (error) {
      /**
       * 步骤 5: 补偿事务 - 释放库存
       * 
       * 如果订单创建或支付创建失败：
       * - 调用产品服务释放库存
       * - 库存会返还到数据库中
       * 
       * 这是 Saga 模式的关键：
       * - 正向操作：checkAndReserveStock（预扣库存）
       * - 反向补偿：releaseStock（释放库存）
       * 
       * 为什么需要补偿：
       * - 数据库事务无法跨服务
       * - 订单服务和产品服务使用不同的数据库连接
       * - 必须手动保证最终一致性
       */
      await requestFromClient(
        this.productClient.send(PRODUCT_PATTERNS.RELEASE_STOCK, {
          items: payload.items,
        }),
      );

      /**
       * 重新抛出异常
       * 
       * 让上层知道操作失败了
       * API Gateway 会捕获并返回错误响应
       */
      throw error;
    }
  }

  // ============ 查询订单 ============

  /**
   * 查询单个订单详情
   * 
   * @param payload - 包含订单 ID、用户 ID、用户角色
   * @returns 订单详情（包含商品明细和支付信息）
   * 
   * 调用链路：
   * 1. 用户请求：GET /api/orders/:id
   * 2. API Gateway: apps/api-gateway/src/orders/orders.controller.ts:52
   * 3. TCP 传输 -> 订单服务控制器：apps/order-service/src/order.controller.ts:23
   * 4. 订单服务：这里的方法
   * 
   * 权限控制：
   * - 用户只能查看自己的订单
   * - 管理员可以查看所有订单
   */
  async findOne(payload: { orderId: string; userId: string; role: UserRole }) {
    /**
     * 查询订单
     * 
     * Prisma 方法：findUnique with include
     * 
     * include:
     * - items: true - 包含关联的订单项
     * - payment: true - 包含关联的支付记录
     * 
     * 与 select 的区别：
     * - include: 包含关联数据
     * - select: 选择特定字段
     */
    const order = await this.prisma.order.findUnique({
      where: { id: payload.orderId },
      include: { items: true, payment: true },
    });

    /**
     * 订单不存在，返回 404
     */
    if (!order) {
      throw rpcError('Order not found', HttpStatus.NOT_FOUND);
    }

    /**
     * 权限检查
     * 
     * 条件：
     * - 如果是管理员（ADMIN），可以查看
     * - 如果是普通用户，只能查看自己的订单（order.userId === payload.userId）
     * 
     * 为什么要检查：
     * - 防止用户查看他人订单，泄露隐私
     * - 订单包含收货地址、联系方式等敏感信息
     */
    if (payload.role !== UserRole.ADMIN && order.userId !== payload.userId) {
      throw rpcError('You cannot access this order', HttpStatus.FORBIDDEN);
    }

    return this.mapOrder(order);
  }

  /**
   * 查询当前用户的订单列表
   * 
   * @param payload - 包含用户 ID
   * @returns 用户的订单数组
   * 
   * 调用链路：
   * 1. 用户请求：GET /api/orders/me
   * 2. API Gateway: apps/api-gateway/src/orders/orders.controller.ts:44
   * 3. TCP 传输 -> 订单服务控制器：apps/order-service/src/order.controller.ts:30
   * 4. 订单服务：这里的方法
   */
  async findMine(payload: { userId: string }) {
    /**
     * 查询用户的所有订单
     * 
     * Prisma 方法：findMany with where + include + orderBy
     * 
     * where: { userId: payload.userId }
     * - 只查询该用户的订单
     * 
     * include: { items: true, payment: true }
     * - 包含商品明细和支付信息
     * 
     * orderBy: { createdAt: 'desc' }
     * - 按创建时间倒序，新订单在前
     */
    const orders = await this.prisma.order.findMany({
      where: { userId: payload.userId },
      include: { items: true, payment: true },
      orderBy: { createdAt: 'desc' },
    });

    /**
     * 转换所有订单的数据格式
     */
    return orders.map((order) => this.mapOrder(order));
  }

  /**
   * 查询所有订单（管理员功能）
   * 
   * @returns 所有订单数组
   * 
   * 调用链路：
   * 1. 管理员请求：GET /api/orders/all（需要添加此接口）
   * 2. 当前代码没有对应的 Gateway 接口
   * 
   * 用途：
   * - 管理员后台查看所有订单
   * - 订单管理、统计分析
   */
  async findAll() {
    /**
     * 查询所有订单
     * 
     * 与 findMine 类似，但没有 where 条件
     */
    const orders = await this.prisma.order.findMany({
      include: { items: true, payment: true },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => this.mapOrder(order));
  }

  // ============ 更新订单状态 ============

  /**
   * 标记订单为已支付
   * 
   * 作用：当支付成功后，支付服务会调用这个方法更新订单状态
   * 
   * @param payload - 包含支付 ID 和支付号
   * @returns 成功消息
   * 
   * 调用链路：
   * 1. 用户确认支付：POST /payments/page/:paymentNo/confirm
   * 2. 支付服务：apps/payment-service/src/payment.service.ts:89
   * 3. TCP 传输 -> 订单服务：ORDER_PATTERNS.MARK_PAID
   * 4. 订单服务控制器：apps/order-service/src/order.controller.ts:42
   * 5. 订单服务：这里的方法
   */
  async markPaid(payload: { paymentId: string; paymentNo: string }) {
    /**
     * 根据 paymentId 查找订单
     * 
     * Prisma 方法：findFirst
     * - 查找第一条匹配的记录
     * 
     * 为什么不用 findUnique：
     * - paymentId 不是 Order 表的主键
     * - paymentId 是外键，但有唯一约束
     */
    const order = await this.prisma.order.findFirst({
      where: { paymentId: payload.paymentId },
    });

    /**
     * 订单不存在，返回 404
     * 
     * 可能原因：
     * - 数据不一致
     * - paymentId 对应的订单已被删除
     */
    if (!order) {
      throw rpcError('Order not found for payment', HttpStatus.NOT_FOUND);
    }

    /**
     * 检查订单是否已标记为已支付
     * 
     * 幂等性处理：
     * - 如果已经支付，直接返回成功
     * - 防止重复处理
     * 
     * 为什么需要幂等性：
     * - 网络问题可能导致重复调用
     * - 用户可能重复点击确认按钮
     */
    if (order.status === 'PAID') {
      return { message: 'Order already marked as paid' };
    }

    /**
     * 更新订单状态为已支付
     * 
     * Prisma 方法：update
     * 
     * 状态流转：
     * PENDING_PAYMENT -> PAID
     */
    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'PAID' },
    });

    return {
      message: 'Order marked as paid',
      orderId: order.id,
      paymentNo: payload.paymentNo,
    };
  }

  // ============ 私有辅助方法 ============

  /**
   * 生成订单号
   * 
   * 格式：ORD-{时间戳}-{UUID 前 8 位大写字母}
   * 示例：ORD-1704067200000-A1B2C3D4
   * 
   * @returns 唯一的订单号
   * 
   * 组成部分：
   * - ORD: 订单前缀（Order）
   * - Date.now(): 时间戳，保证时间顺序
   * - uuidv4().slice(0, 8): UUID 前 8 位，保证唯一性
   * - toUpperCase(): 转为大写，更美观
   */
  private generateOrderNo() {
    return `ORD-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
  }

  /**
   * 转换订单数据格式
   * 
   * 作用：将 Prisma 返回的订单对象转换为适合 API 响应的格式
   * 
   * @param order - Prisma 返回的订单对象
   * @returns 转换后的订单对象
   * 
   * 转换内容：
   * 1. totalAmount: Decimal -> number
   * 2. items[].snapshotPrice: Decimal -> number
   * 3. items[].subtotal: Decimal -> number
   */
  private mapOrder(order: {
    id: string;
    orderNo: string;
    userId: string;
    totalAmount: Prisma.Decimal;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    payment?: { id: string; paymentNo: string; status: string; payUrl: string; qrCodeData: string } | null;
    items: Array<{
      id: string;
      productId: string;
      snapshotTitle: string;
      snapshotPrice: Prisma.Decimal;
      quantity: number;
      subtotal: Prisma.Decimal;
      createdAt: Date;
    }>;
  }) {
    /**
     * 展开运算符 + 属性覆盖
     * 
     * 转换：
     * - totalAmount: 使用 decimalToNumber 转换
     * - items: 遍历每个订单项，转换价格字段
     */
    return {
      ...order,
      totalAmount: decimalToNumber(order.totalAmount),
      items: order.items.map((item) => ({
        ...item,
        snapshotPrice: decimalToNumber(item.snapshotPrice),
        subtotal: decimalToNumber(item.subtotal),
      })),
    };
  }
}
