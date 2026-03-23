/**
 * 订单控制器
 * 
 * 作用：处理订单相关的 HTTP 请求
 * 
 * 路由前缀：/api/orders
 * 
 * 所有接口都需要认证（@UseGuards(AccessAuthGuard) 在类级别）
 * 
 * @module apps/api-gateway/src/orders/orders.controller
 */

import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { requestFromClient } from '../../../../libs/common/rpc';
import {
  CLIENT_TOKENS,
  ORDER_PATTERNS,
} from '../../../../libs/contracts/messages';
import { AccessAuthGuard } from '../auth/access-auth.guard';
import { CreateOrderDto } from '../auth/auth.dto';
import { CurrentUser } from '../auth/current-user.decorator';

/**
 * ApiTags - Swagger 标签
 * 
 * 作用：在 Swagger 文档中将接口归类到 "Orders" 标签下
 */
@ApiTags('Orders')

/**
 * ApiBearerAuth - Swagger 认证标记
 * 
 * 作用：在 Swagger 文档中标记这个控制器的所有接口需要 Bearer Token 认证
 */
@ApiBearerAuth()

/**
 * UseGuards - 类级别守卫
 * 
 * 作用：这个守卫应用于控制器的所有路由
 * 
 * 效果：
 * - 所有接口都需要有效的 JWT Access Token
 * - 不用在每个方法上重复写 @UseGuards(AccessAuthGuard)
 * 
 * 对比方法级别守卫：
 * - 类级别：所有方法都生效
 * - 方法级别：只有特定方法生效
 */
@UseGuards(AccessAuthGuard)

/**
 * Controller - 控制器装饰器
 * 
 * 参数 'orders':
 * - 路由前缀
 * - 所有端点都以 /orders 开头
 * 
 * 完整路由：
 * - POST /api/orders - 创建订单
 * - GET /api/orders/me - 我的订单列表
 * - GET /api/orders/:id - 订单详情
 */
@Controller('orders')
export class OrdersController {
  /**
   * 构造函数注入依赖
   * 
   * @Inject(CLIENT_TOKENS.ORDER_SERVICE):
   * - 注入订单服务客户端
   * - 通过 TCP 与订单服务通信
   */
  constructor(
    @Inject(CLIENT_TOKENS.ORDER_SERVICE)
    private readonly orderClient: ClientProxy,
  ) {}

  // ============ 创建订单 ============

  /**
   * 创建订单接口
   * 
   * HTTP: POST /api/orders
   * 
   * 认证要求：
   * - 需要有效的 JWT Access Token
   * 
   * 请求体：
   * ```json
   * {
   *   "items": [
   *     {
   *       "productId": "clx123",
   *       "quantity": 2
   *     },
   *     {
   *       "productId": "clx456",
   *       "quantity": 1
   *     }
   *   ]
   * }
   * ```
   * 
   * 验证规则（见 CreateOrderDto）：
   * - items: 必填，数组
   * - productId: 必填，字符串
   * - quantity: 必填，整数，>= 1
   * 
   * 响应示例：
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "id": "clx789",
   *     "orderNo": "ORD-1704067200000-A1B2C3D4",
   *     "userId": "clx123",
   *     "totalAmount": 997,
   *     "status": "PENDING_PAYMENT",
   *     "items": [...],
   *     "payment": {
   *       "id": "clx790",
   *       "paymentNo": "PAY-1704067200000-E5F6G7H8",
   *       "status": "CREATED",
   *       "payUrl": "http://localhost:3004/payments/page/PAY-...",
   *       "qrCodeData": "data:image/png;base64,..."
   *     }
   *   },
   *   "timestamp": "..."
   * }
   * ```
   */
  @Post()
  @ApiOperation({ summary: 'Create order and payment' })
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: { sub: string },
  ) {
    /**
     * 参数说明：
     * 
     * @Body() dto:
     * - 获取请求体中的订单数据
     * - 包含商品列表
     * 
     * @CurrentUser() user:
     * - 获取当前登录用户信息
     * - user.sub = 用户 ID
     * 
     * 为什么不需要显式传递 userId：
     * - 从 JWT token 中提取用户 ID
     * - 防止用户伪造他人订单
     */
    
    /**
     * 发送请求到订单服务
     * 
     * ORDER_PATTERNS.CREATE = 'order.create'
     * 
     * payload:
     * - userId: 当前用户 ID
     * - items: 商品列表
     * 
     * 订单服务会执行：
     * 1. 调用产品服务预扣库存
     * 2. 创建订单记录
     * 3. 调用支付服务创建支付
     * 4. 返回订单和支付信息
     */
    return requestFromClient(
      this.orderClient.send(ORDER_PATTERNS.CREATE, {
        userId: user.sub,
        items: dto.items,
      }),
    );
  }

  // ============ 查询我的订单 ============

  /**
   * 查询当前用户订单列表接口
   * 
   * HTTP: GET /api/orders/me
   * 
   * 认证要求：
   * - 需要有效的 JWT Access Token
   * 
   * 响应示例：
   * ```json
   * {
   *   "success": true,
   *   "data": [
   *     {
   *       "id": "clx789",
   *       "orderNo": "ORD-1704067200000-A1B2C3D4",
   *       "totalAmount": 997,
   *       "status": "PAID",
   *       "items": [...],
   *       "payment": {...}
   *     }
   *   ],
   *   "timestamp": "..."
   * }
   * ```
   */
  @Get('me')
  @ApiOperation({ summary: 'List current user orders' })
  findMine(@CurrentUser() user: { sub: string }) {
    /**
     * 发送请求到订单服务
     * 
     * ORDER_PATTERNS.FIND_MINE = 'order.find-mine'
     * 
     * 订单服务会：
     * 1. 查询该用户的所有订单
     * 2. 包含订单项和支付信息
     * 3. 按创建时间倒序排列
     */
    return requestFromClient(
      this.orderClient.send(ORDER_PATTERNS.FIND_MINE, { userId: user.sub }),
    );
  }

  // ============ 查询订单详情 ============

  /**
   * 查询订单详情接口
   * 
   * HTTP: GET /api/orders/:id
   * 
   * 认证要求：
   * - 需要有效的 JWT Access Token
   * 
   * 路由参数：
   * - id: 订单 ID
   * 
   * 权限控制：
   * - 用户只能查看自己的订单
   * - 管理员可以查看所有订单
   * - 订单服务中实现权限检查
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get order detail' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string; role: 'USER' | 'ADMIN' },
  ) {
    /**
     * 参数说明：
     * 
     * @Param('id'):
     * - 从 URL 获取订单 ID
     * 
     * @CurrentUser() user:
     * - 获取当前用户信息
     * - user.sub: 用户 ID
     * - user.role: 用户角色
     * 
     * 传递给订单服务：
     * - orderId: 要查询的订单 ID
     * - userId: 当前用户 ID（用于权限检查）
     * - role: 用户角色（ADMIN 可以查看任何订单）
     */
    return requestFromClient(
      this.orderClient.send(ORDER_PATTERNS.FIND_ONE, {
        orderId: id,
        userId: user.sub,
        role: user.role,
      }),
    );
  }
}
