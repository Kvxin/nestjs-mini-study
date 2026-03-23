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

@Injectable()
export class PaymentServiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(CLIENT_TOKENS.ORDER_SERVICE)
    private readonly orderClient: ClientProxy,
  ) {}

  async createForOrder(payload: {
    orderId: string;
    orderNo: string;
    amount: number;
  }) {
    const paymentNo = `PAY-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
    const baseUrl = this.configService.get<string>(
      'PUBLIC_PAYMENT_BASE_URL',
      `http://localhost:${this.configService.get('PAYMENT_SERVICE_PORT', '3004')}`,
    );
    const payUrl = `${baseUrl}/payments/page/${paymentNo}`;
    const qrCodeData = await QRCode.toDataURL(payUrl);

    const payment = await this.prisma.payment.create({
      data: {
        paymentNo,
        orderId: payload.orderId,
        amount: new Prisma.Decimal(payload.amount),
        payUrl,
        qrCodeData,
      },
    });

    return this.mapPayment(payment);
  }

  async findById(payload: { paymentId: string }) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: payload.paymentId },
    });

    if (!payment) {
      throw rpcError('Payment not found', HttpStatus.NOT_FOUND);
    }

    return this.mapPayment(payment);
  }

  async findByNo(payload: { paymentNo: string }) {
    const payment = await this.prisma.payment.findUnique({
      where: { paymentNo: payload.paymentNo },
    });

    if (!payment) {
      throw rpcError('Payment not found', HttpStatus.NOT_FOUND);
    }

    return this.mapPayment(payment);
  }

  async confirmSuccess(payload: { paymentNo: string }) {
    const payment = await this.prisma.payment.findUnique({
      where: { paymentNo: payload.paymentNo },
    });

    if (!payment) {
      throw rpcError('Payment not found', HttpStatus.NOT_FOUND);
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      return {
        payment: this.mapPayment(payment),
        message: 'Payment already confirmed',
      };
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCESS,
        paidAt: new Date(),
      },
    });

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

  renderPaymentPage(payment: {
    id: string;
    paymentNo: string;
    orderId: string;
    amount: number;
    status: string;
    payUrl: string;
  }) {
    const disabled = payment.status === PaymentStatus.SUCCESS ? 'disabled' : '';
    const buttonText =
      payment.status === PaymentStatus.SUCCESS ? 'Already Paid' : 'Confirm Payment';

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
    return {
      ...payment,
      amount: decimalToNumber(payment.amount),
    };
  }
}
