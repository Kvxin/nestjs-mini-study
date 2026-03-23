/**
 * 微服务通信契约（Contracts）
 * 
 * 这个文件定义了微服务之间通信的所有约定
 * 包含：服务令牌、消息模式、接口类型
 * 
 * 为什么需要这个文件：
 * 1. 避免硬编码字符串：所有微服务使用统一的常量
 * 2. 类型安全：TypeScript 可以检查模式名称是否正确
 * 3. 集中管理：修改消息模式只需改一处
 * 
 * @module libs/contracts/messages
 */

// ============ 客户端令牌 ============

/**
 * 微服务客户端令牌
 * 
 * 作用：用于依赖注入系统中标识不同的微服务客户端
 * 
 * 使用示例（见 apps/api-gateway/src/common/microservice-clients.module.ts）：
 * ```typescript
 * createTcpClientProvider(
 *   CLIENT_TOKENS.USER_SERVICE,  // 'USER_SERVICE'
 *   'USER_SERVICE_HOST',
 *   'USER_SERVICE_PORT',
 * )
 * ```
 * 
 * 注入示例（见 apps/api-gateway/src/auth/auth.controller.ts）：
 * ```typescript
 * @Inject(CLIENT_TOKENS.USER_SERVICE)
 * private readonly userClient: ClientProxy
 * ```
 */
export const CLIENT_TOKENS = {
  USER_SERVICE: 'USER_SERVICE',       // 用户服务客户端令牌
  PRODUCT_SERVICE: 'PRODUCT_SERVICE', // 产品服务客户端令牌
  ORDER_SERVICE: 'ORDER_SERVICE',     // 订单服务客户端令牌
  PAYMENT_SERVICE: 'PAYMENT_SERVICE', // 支付服务客户端令牌
} as const;

// ============ 用户服务消息模式 ============

/**
 * 用户服务消息模式
 * 
 * 作用：定义用户服务支持的所有消息类型（RPC 调用方法）
 * 
 * 工作原理：
 * 1. API Gateway 发送消息：userClient.send(USER_PATTERNS.LOGIN, payload)
 * 2. 用户服务监听：@MessagePattern(USER_PATTERNS.LOGIN)
 * 3. 消息模式作为路由键，匹配对应的处理方法
 * 
 * 使用示例（见 apps/api-gateway/src/auth/auth.controller.ts:53）：
 * ```typescript
 * this.userClient.send(USER_PATTERNS.LOGIN, dto)
 * ```
 * 
 * 监听示例（见 apps/user-service/src/user.controller.ts:14）：
 * ```typescript
 * @MessagePattern(USER_PATTERNS.LOGIN)
 * login(@Payload() payload: { email: string; password: string }) {
 *   return this.userService.login(payload);
 * }
 * ```
 */
export const USER_PATTERNS = {
  REGISTER: 'user.register',          // 用户注册
  LOGIN: 'user.login',                // 用户登录
  REFRESH_TOKEN: 'user.refresh-token',// 刷新访问令牌
  LOGOUT: 'user.logout',              // 用户登出
  GET_PROFILE: 'user.get-profile',    // 获取用户资料
} as const;

// ============ 产品服务消息模式 ============

/**
 * 产品服务消息模式
 * 
 * 使用示例（见 apps/api-gateway/src/products/products.controller.ts:30）：
 * ```typescript
 * this.productClient.send(PRODUCT_PATTERNS.LIST, {})
 * ```
 */
export const PRODUCT_PATTERNS = {
  CREATE: 'product.create',                 // 创建商品
  UPDATE: 'product.update',                 // 更新商品
  DELETE: 'product.delete',                 // 删除商品
  FIND_ONE: 'product.find-one',             // 查询单个商品
  LIST: 'product.list',                     // 查询商品列表
  CHECK_AND_RESERVE_STOCK: 'product.check-and-reserve-stock',  // 检查并预扣库存
  RELEASE_STOCK: 'product.release-stock',   // 释放库存
} as const;

// ============ 订单服务消息模式 ============

/**
 * 订单服务消息模式
 * 
 * 使用示例（见 apps/api-gateway/src/orders/orders.controller.ts:32）：
 * ```typescript
 * this.orderClient.send(ORDER_PATTERNS.CREATE, { userId, items })
 * ```
 */
export const ORDER_PATTERNS = {
  CREATE: 'order.create',         // 创建订单
  FIND_ONE: 'order.find-one',     // 查询单个订单
  FIND_MINE: 'order.find-mine',   // 查询当前用户的订单
  FIND_ALL: 'order.find-all',     // 查询所有订单（管理员）
  MARK_PAID: 'order.mark-paid',   // 标记订单为已支付
} as const;

// ============ 支付服务消息模式 ============

/**
 * 支付服务消息模式
 * 
 * 使用示例（见 apps/order-service/src/order.service.ts:67）：
 * ```typescript
 * this.paymentClient.send(PAYMENT_PATTERNS.CREATE_FOR_ORDER, { orderId, orderNo, amount })
 * ```
 */
export const PAYMENT_PATTERNS = {
  CREATE_FOR_ORDER: 'payment.create-for-order',  // 为订单创建支付
  FIND_BY_ID: 'payment.find-by-id',              // 按 ID 查询支付
  FIND_BY_NO: 'payment.find-by-no',              // 按支付号查询
  CONFIRM_SUCCESS: 'payment.confirm-success',    // 确认支付成功
} as const;

// ============ 类型定义 ============

/**
 * JWT 用户角色类型
 * 
 * 作用：定义 JWT 令牌中 role 字段的可能值
 * 
 * 使用位置：
 * 1. JwtPayload 接口 - JWT 负载结构
 * 2. RolesGuard - 角色权限守卫（见 apps/api-gateway/src/auth/roles.guard.ts）
 * 
 * 权限说明：
 * - USER: 普通用户，可以下单、查看自己的订单
 * - ADMIN: 管理员，可以管理商品、查看所有订单
 */
export type JwtUserRole = 'USER' | 'ADMIN';

/**
 * JWT 负载（Payload）接口
 * 
 * 作用：定义 JWT 令牌中携带的用户信息结构
 * 
 * 属性说明：
 * - sub: subject 的缩写，用户 ID（JWT 标准字段）
 * - email: 用户邮箱，用于识别用户
 * - role: 用户角色，用于权限控制
 * 
 * 使用位置：
 * 1. JWT 策略（见 apps/api-gateway/src/auth/jwt.strategy.ts:19）
 *    validate(payload: JwtPayload) { return payload; }
 * 
 * 2. 当前用户装饰器（见 apps/api-gateway/src/auth/current-user.decorator.ts）
 *    @CurrentUser() user: JwtPayload
 * 
 * 3. 用户服务（见 apps/user-service/src/user.service.ts:147）
 *    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
 */
export interface JwtPayload {
  sub: string;      // 用户 ID
  email: string;    // 用户邮箱
  role: JwtUserRole; // 用户角色
}
