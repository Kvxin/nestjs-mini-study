/**
 * 支付服务 - 核心业务逻辑
 * 
 * 作用：处理支付相关的所有业务逻辑
 * 包括：创建支付记录、生成支付二维码、确认支付
 * 
 * 这个服务运行在独立的微服务进程中（端口 3004）
 * 特点：
 * - 既是微服务（TCP），也是 HTTP 服务（提供支付页面）
 * - 通过 TCP 与订单服务通信
 * - 通过 HTTP 向用户提供支付页面
 * 
 * @module apps/payment-service/src/payment.service
 */

import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Prisma, PaymentStatus } from '@prisma/client';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../../libs/prisma/prisma.service';
import { requestFromClient, rpcError } from '../../../libs/common/rpc';
import {
  CLIENT_TOKENS,
  ORDER_PATTERNS,
} from '../../../libs/contracts/messages';
import { decimalToNumber } from '../../../libs/common/utils';

/**
 * 支付服务类
 * 
 * @Injectable() 装饰器：
 * - 标记这个类可以被依赖注入
 * - NestJS 会自动创建实例并注入依赖
 * 
 * 依赖注入：
 * - PrismaService: 数据库操作
 * - ConfigService: 读取环境变量配置
 * - ORDER_SERVICE: 订单服务客户端（用于更新订单状态）
 */
@Injectable()
export class PaymentServiceService {
  /**
   * 构造函数注入依赖
   * 
   * 依赖说明：
   * - prisma: 数据库客户端
   * - configService: 配置服务，用于读取 PUBLIC_PAYMENT_BASE_URL
   * - orderClient: 订单服务客户端，用于支付成功后更新订单状态
   */
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    @Inject(CLIENT_TOKENS.ORDER_SERVICE)
    private readonly orderClient: ClientProxy,
  ) {}

  // ============ 创建支付 ============

  /**
   * 为订单创建支付记录
   * 
   * 作用：当订单创建后，自动生成对应的支付记录
   * 
   * @param payload - 包含订单 ID、订单号、支付金额
   * @returns 支付记录（包含支付号、二维码数据、支付链接）
   * 
   * 调用链路：
   * 1. 订单服务创建订单后调用
   * 2. 订单服务：apps/order-service/src/order.service.ts:67
   * 3. TCP 传输 -> PAYMENT_PATTERNS.CREATE_FOR_ORDER
   * 4. 支付服务控制器：apps/payment-service/src/payment.controller.ts:14
   * 5. 支付服务：这里的方法
   * 
   * 生成内容：
   * - paymentNo: 支付号（唯一标识）
   * - payUrl: 支付页面 URL
   * - qrCodeData: 二维码图片数据（Base64）
   */
  async createForOrder(payload: {
    orderId: string;
    orderNo: string;
    amount: number;
  }) {
    /**
     * 生成支付号
     * 
     * 格式：PAY-{时间戳}-{UUID 前 8 位大写字母}
     * 示例：PAY-1704067200000-A1B2C3D4
     * 
     * 与订单号类似，使用有意义的编号而不是纯 ID
     */
    const paymentNo = `PAY-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
    
    /**
     * 获取支付基础 URL
     * 
     * 从环境变量读取 PUBLIC_PAYMENT_BASE_URL
     * 默认值：http://localhost:3004
     * 
     * 为什么需要配置：
     * - 生产环境需要公网可访问的 URL
     * - 用户扫描二维码后需要能访问支付页面
     * - 本地开发用 localhost，生产环境用域名
     * 
     * 重要提示（见 README.md）：
     * - 如果需要手机真实扫码，必须把手机能访问的 URL
     * - 不能是 localhost（手机无法访问电脑 localhost）
     * - 需要配置为局域网 IP 或公网域名
     */
    const baseUrl = this.configService.get<string>(
      'PUBLIC_PAYMENT_BASE_URL',
      `http://localhost:${this.configService.get('PAYMENT_SERVICE_PORT', '3004')}`,
    );
    
    /**
     * 构建支付页面 URL
     * 
     * 格式：{baseUrl}/payments/page/{paymentNo}
     * 示例：http://localhost:3004/payments/page/PAY-1704067200000-A1B2C3D4
     * 
     * 用户访问这个 URL 可以看到支付确认页面
     */
    const payUrl = `${baseUrl}/payments/page/${paymentNo}`;
    
    /**
     * 生成二维码数据
     * 
     * QRCode.toDataURL:
     * - 将 URL 编码为 QR Code 图片
     * - 返回 Base64 格式的 DataURL
     * - 格式：data:image/png;base64,iVBORw0KG...
     * 
     * 用途：
     * - 前端可以直接显示二维码图片
     * - <img src="data:image/png;base64,..." />
     * 
     * 用户扫码后：
     * - 手机浏览器打开 payUrl
     * - 显示支付确认页面
     * - 点击"Confirm Payment"完成支付
     */
    const qrCodeData = await QRCode.toDataURL(payUrl);

    /**
     * 创建支付记录
     * 
     * Prisma 方法：create
     * 
     * 数据说明：
     * - paymentNo: 支付号（唯一）
     * - orderId: 关联的订单 ID
     * - amount: 支付金额（使用 Prisma.Decimal 确保精度）
     * - payUrl: 支付页面 URL
     * - qrCodeData: 二维码数据
     * 
     * 默认值：
     * - status: CREATED（已创建，待支付）
     * - paidAt: null（未支付）
     */
    const payment = await this.prisma.payment.create({
      data: {
        paymentNo,
        orderId: payload.orderId,
        amount: new Prisma.Decimal(payload.amount),
        payUrl,
        qrCodeData,
      },
    });

    /**
     * 转换数据格式并返回
     * 
     * mapPayment: 将 Decimal 转为 number
     */
    return this.mapPayment(payment);
  }

  // ============ 查询支付 ============

  /**
   * 按 ID 查询支付记录
   * 
   * @param payload - 包含支付 ID
   * @returns 支付记录详情
   * 
   * 调用链路：
   * 1. 请求：GET /api/payments/:paymentId/qrcode
   * 2. API Gateway: apps/api-gateway/src/payments/payments.controller.ts:22
   * 3. TCP 传输 -> PAYMENT_PATTERNS.FIND_BY_ID
   * 4. 支付服务控制器：apps/payment-service/src/payment.controller.ts:19
   * 5. 支付服务：这里的方法
   */
  async findById(payload: { paymentId: string }) {
    /**
     * 按 ID 查询支付记录
     * 
     * Prisma 方法：findUnique
     */
    const payment = await this.prisma.payment.findUnique({
      where: { id: payload.paymentId },
    });

    /**
     * 支付记录不存在，返回 404
     */
    if (!payment) {
      throw rpcError('Payment not found', HttpStatus.NOT_FOUND);
    }

    return this.mapPayment(payment);
  }

  /**
   * 按支付号查询支付记录
   * 
   * @param payload - 包含支付号
   * @returns 支付记录详情
   * 
   * 调用链路：
   * 1. 用户访问支付页面：GET /payments/page/:paymentNo
   * 2. 支付页面控制器：apps/payment-service/src/payment-page.controller.ts:12
   * 3. 支付服务：这里的方法
   */
  async findByNo(payload: { paymentNo: string }) {
    /**
     * 按支付号查询
     * 
     * paymentNo 有唯一约束，可以用 findUnique
     */
    const payment = await this.prisma.payment.findUnique({
      where: { paymentNo: payload.paymentNo },
    });

    if (!payment) {
      throw rpcError('Payment not found', HttpStatus.NOT_FOUND);
    }

    return this.mapPayment(payment);
  }

  // ============ 确认支付 ============

  /**
   * 确认支付成功
   * 
   * 作用：用户点击"Confirm Payment"按钮后，更新支付状态并通知订单服务
   * 
   * @param payload - 包含支付号
   * @returns 支付记录和成功消息
   * 
   * 调用链路：
   * 1. 用户提交支付表单：POST /payments/page/:paymentNo/confirm
   * 2. 支付页面控制器：apps/payment-service/src/payment-page.controller.ts:24
   * 3. 支付服务：这里的方法
   * 
   * 状态流转：
   * CREATED -> SUCCESS
   */
  async confirmSuccess(payload: { paymentNo: string }) {
    /**
     * 查询支付记录
     */
    const payment = await this.prisma.payment.findUnique({
      where: { paymentNo: payload.paymentNo },
    });

    if (!payment) {
      throw rpcError('Payment not found', HttpStatus.NOT_FOUND);
    }

    /**
     * 幂等性检查
     * 
     * 如果支付已经是 SUCCESS 状态，直接返回
     * 
     * 为什么需要：
     * - 防止重复提交
     * - 用户可能多次点击确认按钮
     * - 网络问题可能导致重复请求
     */
    if (payment.status === PaymentStatus.SUCCESS) {
      return {
        payment: this.mapPayment(payment),
        message: 'Payment already confirmed',
      };
    }

    /**
     * 更新支付状态为成功
     * 
     * Prisma 方法：update
     * 
     * 更新字段：
     * - status: SUCCESS
     * - paidAt: 当前时间
     */
    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCESS,
        paidAt: new Date(),
      },
    });

    /**
     * 通知订单服务更新订单状态
     * 
     * 这是分布式事务的关键步骤：
     * 1. 支付服务更新支付状态为 SUCCESS
     * 2. 调用订单服务，更新订单状态为 PAID
     * 
     * ORDER_PATTERNS.MARK_PAID:
     * - 消息模式：'order.mark-paid'
     * - 订单服务会监听这个模式
     * 
     * 如果这一步失败：
     * - 支付已经是 SUCCESS，但订单还是 PENDING_PAYMENT
     * - 数据不一致
     * - 需要人工介入或对账系统修复
     * 
     * 改进方案：
     * - 使用消息队列确保消息必达
     * - 添加定时任务检查未匹配的支付和订单
     */
    await requestFromClient(
      this.orderClient.send(ORDER_PATTERNS.MARK_PAID, {
        paymentId: updatedPayment.id,
        paymentNo: updatedPayment.paymentNo,
      }),
    );

    return {
      payment: this.mapPayment(updatedPayment),
      message: 'Payment confirmed successfully',
    };
  }

  // ============ 渲染支付页面 ============

  /**
   * 渲染支付确认页面 HTML
   * 
   * 作用：生成一个美观的支付确认页面
   * 
   * @param payment - 支付记录
   * @returns HTML 字符串
   * 
   * 调用链路：
   * 1. 用户访问：GET /payments/page/:paymentNo
   * 2. 支付页面控制器：apps/payment-service/src/payment-page.controller.ts:12
   * 3. 支付服务：这里的方法
   * 
   * 页面功能：
   * - 显示支付信息（支付号、订单 ID、金额、状态）
   * - 提供"Confirm Payment"按钮
   * - 已支付的订单按钮禁用
   */
  renderPaymentPage(payment: {
    id: string;
    paymentNo: string;
    orderId: string;
    amount: number;
    status: string;
    payUrl: string;
  }) {
    /**
     * 按钮状态控制
     * 
     * 如果已支付，按钮禁用
     * disabled 属性：HTML 表单按钮禁用属性
     */
    const disabled = payment.status === PaymentStatus.SUCCESS ? 'disabled' : '';
    
    /**
     * 按钮文字
     * 
     * 根据支付状态显示不同文字：
     * - 已支付："Already Paid"
     * - 未支付："Confirm Payment"
     */
    const buttonText =
      payment.status === PaymentStatus.SUCCESS ? 'Already Paid' : 'Confirm Payment';

    /**
     * 返回 HTML 模板
     * 
     * 这是一个内联的 HTML 模板，包含：
     * - HTML 结构
     * - CSS 样式（内联）
     * - 动态数据插值（${payment.xxx}）
     * 
     * 页面特点：
     * - 响应式设计（适配手机和电脑）
     * - 美观的渐变背景和卡片效果
     * - 表单提交到 /payments/page/:paymentNo/confirm
     */
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mock Payment</title>
  <style>
    body{font-family:Arial,sans-serif;background:linear-gradient(135deg,#f5efe6,#dbeafe);min-height:100vh;display:flex;align-items:center;justify-content:center;margin:0}
    .card{width:min(92vw,460px);background:#fff;border-radius:20px;padding:32px;box-shadow:0 20px 60px rgba(15,23,42,.18)}
    h1{margin:0 0 12px;font-size:28px}
    .meta{color:#475569;line-height:1.7}
    button{width:100%;margin-top:24px;padding:14px 18px;border:none;border-radius:12px;background:#0f172a;color:#fff;font-size:16px;cursor:pointer}
    button:disabled{cursor:not-allowed;background:#94a3b8}
    .ok{margin-top:16px;color:#166534;font-weight:600}
  </style>
</head>
<body>
  <div class="card">
    <h1>Mock Payment</h1>
    <div class="meta">Payment No: ${payment.paymentNo}</div>
    <div class="meta">Order ID: ${payment.orderId}</div>
    <div class="meta">Amount: ¥${payment.amount.toFixed(2)}</div>
    <div class="meta">Status: ${payment.status}</div>
    <form method="post" action="/payments/page/${payment.paymentNo}/confirm">
      <button type="submit" ${disabled}>${buttonText}</button>
    </form>
    ${
      payment.status === PaymentStatus.SUCCESS
        ? '<div class="ok">Payment already completed.</div>'
        : ''
    }
  </div>
</body>
</html>`;
  }

  // ============ 私有辅助方法 ============

  /**
   * 转换支付数据格式
   * 
   * 作用：将 Prisma 返回的支付对象转换为适合 API 响应的格式
   * 
   * @param payment - Prisma 返回的支付对象
   * @returns 转换后的支付对象
   * 
   * 转换内容：
   * - amount: Decimal -> number
   */
  private mapPayment(payment: {
    id: string;
    paymentNo: string;
    orderId: string;
    amount: Prisma.Decimal;
    status: PaymentStatus;
    payUrl: string;
    qrCodeData: string;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    /**
     * 展开运算符 + 属性覆盖
     * 
     * 只转换 amount 字段
     */
    return {
      ...payment,
      amount: decimalToNumber(payment.amount),
    };
  }
}
