/**
 * 产品服务 - 核心业务逻辑
 * 
 * 作用：处理商品相关的所有业务逻辑
 * 包括：商品的增删改查、库存管理
 * 
 * 这个服务运行在独立的微服务进程中（端口 3002）
 * 通过 TCP 与 API Gateway 和订单服务通信
 * 
 * @module apps/product-service/src/product.service
 */

import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { decimalToNumber } from '../../../libs/common/utils';
import { rpcError } from '../../../libs/common/rpc';
import { PrismaService } from '../../../libs/prisma/prisma.service';

/**
 * 产品服务类
 * 
 * @Injectable() 装饰器：
 * - 标记这个类可以被依赖注入
 * - NestJS 会自动创建实例并注入依赖
 * 
 * 依赖注入：
 * - PrismaService: 数据库操作
 */
@Injectable()
export class ProductServiceService {
  /**
   * 构造函数注入依赖
   * 
   * 只注入了 PrismaService，因为：
   * - 产品服务不需要处理认证（由 API Gateway 负责）
   * - 不需要 JWT 相关功能
   */
  constructor(private readonly prisma: PrismaService) {}

  // ============ 创建商品 ============

  /**
   * 创建商品
   * 
   * @param payload - 商品信息
   * @returns 创建后的商品（包含自动生成的字段）
   * 
   * 调用链路：
   * 1. 管理员请求：POST /api/products
   * 2. API Gateway: apps/api-gateway/src/products/products.controller.ts:41
   * 3. TCP 传输 -> 产品服务控制器：apps/product-service/src/product.controller.ts:14
   * 4. 产品服务：这里的方法
   * 
   * 权限控制：
   * - 只有 ADMIN 角色可以创建商品
   * - 权限验证在 API Gateway 层（RolesGuard）
   */
  async create(payload: {
    title: string;
    description?: string;
    price: number;
    stock: number;
    status?: ProductStatus;
    coverUrl?: string;
  }) {
    /**
     * 创建商品记录
     * 
     * Prisma 方法：create
     * - 插入一条新记录到 Product 表
     * 
     * 数据处理：
     * - ...payload: 展开运算符，复制 payload 的所有属性
     * - price: 使用 Prisma.Decimal 包装，确保精度
     * - status: 如果没有提供，默认为 ACTIVE
     * 
     * 为什么价格要用 Decimal：
     * - JavaScript 的 number 是浮点数，有精度问题
     * - 例如：0.1 + 0.2 = 0.30000000000000004
     * - Decimal 可以精确表示小数，适合金融场景
     */
    const product = await this.prisma.product.create({
      data: {
        ...payload,
        price: new Prisma.Decimal(payload.price),
        status: payload.status ?? ProductStatus.ACTIVE,
      },
    });

    /**
     * 转换数据格式
     * 
     * mapProduct 方法会：
     * - 将 Decimal 类型的 price 转为 number
     * - 便于 JSON 序列化和前端使用
     */
    return this.mapProduct(product);
  }

  // ============ 更新商品 ============

  /**
   * 更新商品
   * 
   * @param payload - 更新数据，包含商品 ID 和要更新的字段
   * @returns 更新后的商品
   * 
   * 调用链路：
   * 1. 管理员请求：PATCH /api/products/:id
   * 2. API Gateway: apps/api-gateway/src/products/products.controller.ts:56
   * 3. TCP 传输 -> 产品服务控制器：apps/product-service/src/product.controller.ts:19
   * 4. 产品服务：这里的方法
   * 
   * 特点：
   * - 所有字段都是可选的，只更新提供的字段
   * - 使用 PATCH 而不是 PUT，支持部分更新
   */
  async update(payload: {
    id: string;
    title?: string;
    description?: string;
    price?: number;
    stock?: number;
    status?: ProductStatus;
    coverUrl?: string;
  }) {
    /**
     * 检查商品是否存在
     * 
     * 为什么要先检查：
     * - Prisma 的 update 方法在记录不存在时会抛出异常
     * - 这里可以自定义错误消息和状态码
     */
    const existing = await this.prisma.product.findUnique({
      where: { id: payload.id },
    });

    /**
     * 商品不存在，返回 404
     */
    if (!existing) {
      throw rpcError('Product not found', HttpStatus.NOT_FOUND);
    }

    /**
     * 更新商品记录
     * 
     * Prisma 方法：update
     * - 更新现有记录
     * 
     * 数据处理：
     * - title, description, status, coverUrl: 直接赋值（undefined 表示不更新）
     * - price: 使用 Prisma.Decimal 包装（如果提供了）
     * - stock: 直接赋值
     * 
     * 为什么 price 要特殊处理：
     * - payload.price !== undefined 检查是否提供了价格
     * - 如果为 undefined，Prisma 会忽略这个字段
     * - 这样可以实现部分更新
     */
    const product = await this.prisma.product.update({
      where: { id: payload.id },
      data: {
        title: payload.title,
        description: payload.description,
        price:
          payload.price !== undefined
            ? new Prisma.Decimal(payload.price)
            : undefined,
        stock: payload.stock,
        status: payload.status,
        coverUrl: payload.coverUrl,
      },
    });

    return this.mapProduct(product);
  }

  // ============ 删除商品 ============

  /**
   * 删除商品
   * 
   * @param payload - 包含商品 ID
   * @returns 成功消息
   * 
   * 调用链路：
   * 1. 管理员请求：DELETE /api/products/:id
   * 2. API Gateway: apps/api-gateway/src/products/products.controller.ts:70
   * 3. TCP 传输 -> 产品服务控制器：apps/product-service/src/product.controller.ts:24
   * 4. 产品服务：这里的方法
   * 
   * 注意：
   * - 如果有订单引用了这个商品，删除会失败（外键约束）
   * - OrderItem 与 Product 是 Restrict 关系（见 prisma/schema.prisma:171）
   */
  async delete(payload: { id: string }) {
    /**
     * 删除商品记录
     * 
     * Prisma 方法：delete
     * - 从数据库删除记录
     * 
     * 如果商品不存在，Prisma 会抛出异常
     * 如果商品被订单引用，外键约束会阻止删除
     */
    await this.prisma.product.delete({ where: { id: payload.id } });
    return { message: 'Product deleted' };
  }

  // ============ 查询单个商品 ============

  /**
   * 查询单个商品详情
   * 
   * @param payload - 包含商品 ID
   * @returns 商品详情
   * 
   * 调用链路：
   * 1. 用户请求：GET /api/products/:id
   * 2. API Gateway: apps/api-gateway/src/products/products.controller.ts:35
   * 3. TCP 传输 -> 产品服务控制器：apps/product-service/src/product.controller.ts:29
   * 4. 产品服务：这里的方法
   * 
   * 权限：
   * - 所有用户（包括未登录）都可以查看商品
   */
  async findOne(payload: { id: string }) {
    /**
     * 按 ID 查询商品
     * 
     * Prisma 方法：findUnique
     * - 基于主键查询，效率最高
     */
    const product = await this.prisma.product.findUnique({
      where: { id: payload.id },
    });

    /**
     * 商品不存在，返回 404
     */
    if (!product) {
      throw rpcError('Product not found', HttpStatus.NOT_FOUND);
    }

    return this.mapProduct(product);
  }

  // ============ 查询商品列表 ============

  /**
   * 查询商品列表
   * 
   * @returns 商品数组，按创建时间倒序
   * 
   * 调用链路：
   * 1. 用户请求：GET /api/products
   * 2. API Gateway: apps/api-gateway/src/products/products.controller.ts:30
   * 3. TCP 传输 -> 产品服务控制器：apps/product-service/src/product.controller.ts:34
   * 4. 产品服务：这里的方法
   * 
   * 特点：
   * - 没有分页，返回所有商品
   * - 实际项目中应该添加分页功能
   */
  async list() {
    /**
     * 查询所有商品
     * 
     * Prisma 方法：findMany
     * - 查询多条记录
     * 
     * orderBy: 排序
     * - createdAt: 'desc' - 按创建时间倒序，新商品在前
     */
    const products = await this.prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });

    /**
     * 转换所有商品的价格格式
     * 
     * map 方法遍历每个商品，调用 mapProduct 转换
     */
    return products.map((product) => this.mapProduct(product));
  }

  // ============ 库存管理 ============

  /**
   * 检查并预扣库存
   * 
   * 作用：在创建订单时，检查库存是否充足，并预扣相应数量
   * 
   * @param payload - 包含商品 ID 和数量的数组
   * @returns 包含商品快照和总金额的對象
   * 
   * 调用链路：
   * 1. 用户下单：POST /api/orders
   * 2. API Gateway -> 订单服务：apps/order-service/src/order.service.ts:28
   * 3. 订单服务调用产品服务：PRODUCT_PATTERNS.CHECK_AND_RESERVE_STOCK
   * 4. 产品服务控制器：apps/product-service/src/product.controller.ts:39
   * 5. 产品服务：这里的方法
   * 
   * 为什么要预扣库存：
   * 1. 防止超卖：下单后库存立即减少，其他用户无法购买
   * 2. 事务一致性：如果订单创建失败，库存会回滚
   * 3. 价格快照：保存下单时的价格，即使后来调价也不影响
   * 
   * 关键特性：
   * - 使用数据库事务（$transaction）保证原子性
   * - 要么所有商品都预扣成功，要么全部回滚
   */
  async checkAndReserveStock(payload: {
    items: Array<{ productId: string; quantity: number }>;
  }) {
    /**
     * 验证订单项不能为空
     * 
     * 防御性编程：
     * - 空订单没有意义
     * - 提前检查避免后续错误
     */
    if (payload.items.length === 0) {
      throw rpcError('Order items cannot be empty');
    }

    /**
     * 数据库事务
     * 
     * Prisma 方法：$transaction
     * - 传入异步函数，函数内的所有操作要么全部成功，要么全部回滚
     * 
     * 使用场景：
     * 1. 检查商品是否存在且已上架
     * 2. 检查库存是否充足
     * 3. 扣减库存
     * 4. 生成价格快照
     * 
     * 如果任何一步失败，整个事务回滚，库存恢复原状
     * 
     * tx 参数：事务客户端，用于在事务内执行查询
     */
    return this.prisma.$transaction(async (tx) => {
      /**
       * 快照数组
       * 
       * 作用：保存下单时每个商品的信息
       * 
       * 为什么要快照：
       * - 商品价格可能变化，订单中需要保留下单时的价格
       * - 商品标题可能修改，订单中需要保留下单时的名称
       * - 即使商品后来被删除，订单仍然可以查看
       */
      const snapshots: Array<{
        productId: string;
        snapshotTitle: string;
        snapshotPrice: number;
        quantity: number;
        subtotal: number;
      }> = [];

      /**
       * 总金额累加器
       * 
       * 用于计算订单总金额
       */
      let totalAmount = 0;

      /**
       * 遍历每个订单项
       * 
       * 使用 for...of 而不是 forEach：
       * - 因为循环体内有 await 异步操作
       * - for...of 可以顺序执行，等待每个操作完成
       * - 可以在任何时刻 throw 错误，触发事务回滚
       */
      for (const item of payload.items) {
        /**
         * 查询商品信息
         * 
         * 使用 tx.product 而不是 this.prisma.product：
         * - tx 是事务客户端，确保查询在事务内执行
         * - 事务内的查询会受到事务隔离级别的影响
         */
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        /**
         * 验证商品状态
         * 
         * 检查条件：
         * 1. 商品是否存在
         * 2. 商品状态是否为 ACTIVE（上架）
         * 
         * 如果商品不存在或已下架，抛出错误
         */
        if (!product || product.status !== ProductStatus.ACTIVE) {
          throw rpcError(`Product ${item.productId} is unavailable`, HttpStatus.BAD_REQUEST);
        }

        /**
         * 检查库存是否充足
         * 
         * 如果库存不足，抛出错误
         * 
         * 注意：
         * - 这里使用 product.title，方便用户理解哪个商品库存不足
         */
        if (product.stock < item.quantity) {
          throw rpcError(`Insufficient stock for ${product.title}`, HttpStatus.BAD_REQUEST);
        }

        /**
         * 扣减库存
         * 
         * Prisma 原子操作：decrement
         * - 原子性地减少指定数量的库存
         * - 比先查询再更新更安全，避免并发问题
         * 
         * 示例：
         * stock: { decrement: 2 } -> stock = stock - 2
         */
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: item.quantity } },
        });

        /**
         * 计算小计金额
         * 
         * decimalToNumber: 将 Decimal 转为 number
         * subtotal = 单价 × 数量
         */
        const snapshotPrice = decimalToNumber(product.price);
        const subtotal = snapshotPrice * item.quantity;
        
        /**
         * 累加到总金额
         */
        totalAmount += subtotal;

        /**
         * 保存商品快照
         * 
         * 快照包含：
         * - productId: 商品 ID，用于关联
         * - snapshotTitle: 商品标题快照
         * - snapshotPrice: 商品价格快照
         * - quantity: 购买数量
         * - subtotal: 小计金额
         */
        snapshots.push({
          productId: product.id,
          snapshotTitle: product.title,
          snapshotPrice,
          quantity: item.quantity,
          subtotal,
        });
      }

      /**
       * 返回事务结果
       * 
       * 订单服务会使用这些数据：
       * - items: 创建订单项
       * - totalAmount: 设置订单总金额
       */
      return {
        items: snapshots,
        totalAmount,
      };
    });
  }

  /**
   * 释放库存
   * 
   * 作用：当订单取消或创建失败时，将预扣的库存返还
   * 
   * @param payload - 包含商品 ID 和数量的数组
   * @returns 成功消息
   * 
   * 调用链路：
   * 1. 订单创建失败：apps/order-service/src/order.service.ts:80
   * 2. 订单服务调用：PRODUCT_PATTERNS.RELEASE_STOCK
   * 3. 产品服务控制器：apps/product-service/src/product.controller.ts:46
   * 4. 产品服务：这里的方法
   * 
   * 使用场景：
   * - 订单创建过程中发生错误
   * - 支付超时，订单取消
   * - 用户主动取消订单
   */
  async releaseStock(payload: {
    items: Array<{ productId: string; quantity: number }>;
  }) {
    /**
     * 批量更新库存
     * 
     * Prisma 方法：$transaction
     * - 传入数组，并行执行多个操作
     * - 与传入函数的方式不同，这是并行事务
     * 
     * 使用 map 生成更新操作数组：
     * - 每个商品一个更新操作
     * - 使用 increment 原子性地增加库存
     */
    await this.prisma.$transaction(
      payload.items.map((item) =>
        this.prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        }),
      ),
    );

    return { message: 'Stock released' };
  }

  // ============ 私有辅助方法 ============

  /**
   * 转换商品数据格式
   * 
   * 作用：将 Prisma 返回的商品对象转换为适合 API 响应的格式
   * 
   * @param product - Prisma 返回的商品对象
   * @returns 转换后的商品对象
   * 
   * 为什么要转换：
   * - Prisma 的 Decimal 类型不能直接 JSON 序列化
   * - 需要转为普通的 number 类型
   * 
   * 使用位置：
   * - 所有返回商品的方法都会调用这个函数
   */
  private mapProduct(product: {
    id: string;
    title: string;
    description: string | null;
    price: Prisma.Decimal;
    stock: number;
    status: ProductStatus;
    coverUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    /**
     * 展开运算符 + 属性覆盖
     * 
     * {
     *   ...product,           // 复制所有原有属性
     *   price: decimalToNumber(product.price)  // 覆盖 price 属性
     * }
     * 
     * 结果：
     * - 其他字段保持不变
     * - price 从 Decimal 转为 number
     */
    return {
      ...product,
      price: decimalToNumber(product.price),
    };
  }
}
