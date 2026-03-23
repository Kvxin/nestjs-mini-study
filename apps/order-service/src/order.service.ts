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

@Injectable()
export class OrderServiceService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLIENT_TOKENS.PRODUCT_SERVICE)
    private readonly productClient: ClientProxy,
    @Inject(CLIENT_TOKENS.PAYMENT_SERVICE)
    private readonly paymentClient: ClientProxy,
  ) {}

  async create(payload: {
    userId: string;
    items: Array<{ productId: string; quantity: number }>;
  }) {
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

    const orderNo = this.generateOrderNo();

    try {
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

      const updatedOrder = await this.prisma.order.update({
        where: { id: order.id },
        data: { paymentId: payment.id },
        include: { items: true },
      });

      return {
        ...this.mapOrder(updatedOrder),
        payment,
      };
    } catch (error) {
      await requestFromClient(
        this.productClient.send(PRODUCT_PATTERNS.RELEASE_STOCK, {
          items: payload.items,
        }),
      );

      throw error;
    }
  }

  async findOne(payload: { orderId: string; userId: string; role: UserRole }) {
    const order = await this.prisma.order.findUnique({
      where: { id: payload.orderId },
      include: { items: true, payment: true },
    });

    if (!order) {
      throw rpcError('Order not found', HttpStatus.NOT_FOUND);
    }

    if (payload.role !== UserRole.ADMIN && order.userId !== payload.userId) {
      throw rpcError('You cannot access this order', HttpStatus.FORBIDDEN);
    }

    return this.mapOrder(order);
  }

  async findMine(payload: { userId: string }) {
    const orders = await this.prisma.order.findMany({
      where: { userId: payload.userId },
      include: { items: true, payment: true },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => this.mapOrder(order));
  }

  async findAll() {
    const orders = await this.prisma.order.findMany({
      include: { items: true, payment: true },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => this.mapOrder(order));
  }

  async markPaid(payload: { paymentId: string; paymentNo: string }) {
    const order = await this.prisma.order.findFirst({
      where: { paymentId: payload.paymentId },
    });

    if (!order) {
      throw rpcError('Order not found for payment', HttpStatus.NOT_FOUND);
    }

    if (order.status === 'PAID') {
      return { message: 'Order already marked as paid' };
    }

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

  private generateOrderNo() {
    return `ORD-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
  }

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
