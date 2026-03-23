/**
 * 支付控制器
 * 
 * 作用：处理支付相关的 HTTP 请求
 * 
 * 路由前缀：/api/payments
 * 
 * 所有接口都需要认证
 * 
 * @module apps/api-gateway/src/payments/payments.controller
 */

import { Controller, Get, Inject, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { requestFromClient } from '../../../../libs/common/rpc';
import {
  CLIENT_TOKENS,
  PAYMENT_PATTERNS,
} from '../../../../libs/contracts/messages';
import { AccessAuthGuard } from '../auth/access-auth.guard';

/**
 * ApiTags - Swagger 标签
 * 
 * 作用：在 Swagger 文档中将接口归类到 "Payments" 标签下
 */
@ApiTags('Payments')

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
 */
@UseGuards(AccessAuthGuard)

/**
 * Controller - 控制器装饰器
 * 
 * 参数 'payments':
 * - 路由前缀
 * - 所有端点都以 /payments 开头
 * 
 * 完整路由：
 * - GET /api/payments/:paymentId/qrcode - 获取支付二维码
 */
@Controller('payments')
export class PaymentsController {
  /**
   * 构造函数注入依赖
   * 
   * @Inject(CLIENT_TOKENS.PAYMENT_SERVICE):
   * - 注入支付服务客户端
   * - 通过 TCP 与支付服务通信
   */
  constructor(
    @Inject(CLIENT_TOKENS.PAYMENT_SERVICE)
    private readonly paymentClient: ClientProxy,
  ) {}

  // ============ 获取支付二维码 ============

  /**
   * 获取支付二维码接口
   * 
   * HTTP: GET /api/payments/:paymentId/qrcode
   * 
   * 认证要求：
   * - 需要有效的 JWT Access Token
   * 
   * 路由参数：
   * - paymentId: 支付记录 ID
   * 
   * 使用场景：
   * - 用户下单后，获取支付二维码
   * - 前端显示二维码，用户扫码支付
   * 
   * 响应示例：
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "id": "clx790",
   *     "paymentNo": "PAY-1704067200000-E5F6G7H8",
   *     "orderId": "clx789",
   *     "amount": 997,
   *     "status": "CREATED",
   *     "payUrl": "http://localhost:3004/payments/page/PAY-...",
   *     "qrCodeData": "data:image/png;base64,iVBORw0KG..."
   *   },
   *   "timestamp": "..."
   * }
   * ```
   * 
   * 前端使用：
   * ```html
   * <!-- 显示二维码 -->
   * <img :src="response.data.qrCodeData" alt="Payment QR Code" />
   * ```
   */
  @Get(':paymentId/qrcode')
  @ApiOperation({ summary: 'Get payment detail and QR code data' })
  findQrCode(@Param('paymentId') paymentId: string) {
    /**
     * @Param('paymentId'):
     * - 从 URL 获取支付 ID
     * 
     * 发送请求到支付服务
     * 
     * PAYMENT_PATTERNS.FIND_BY_ID = 'payment.find-by-id'
     * 
     * 支付服务会：
     * 1. 查询支付记录
     * 2. 返回支付信息（包含二维码数据）
     * 
     * qrCodeData 格式：
     * - Base64 编码的 PNG 图片
     * - DataURL 格式：data:image/png;base64,...
     * - 可以直接作为 img 标签的 src
     */
    return requestFromClient(
      this.paymentClient.send(PAYMENT_PATTERNS.FIND_BY_ID, { paymentId }),
    );
  }
}
