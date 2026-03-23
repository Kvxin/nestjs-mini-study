import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { decimalToNumber } from '../../../libs/common/utils';
import { rpcError } from '../../../libs/common/rpc';
import { PrismaService } from '../../../libs/prisma/prisma.service';

@Injectable()
export class ProductServiceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: {
    title: string;
    description?: string;
    price: number;
    stock: number;
    status?: ProductStatus;
    coverUrl?: string;
  }) {
    const product = await this.prisma.product.create({
      data: {
        ...payload,
        price: new Prisma.Decimal(payload.price),
        status: payload.status ?? ProductStatus.ACTIVE,
      },
    });

    return this.mapProduct(product);
  }

  async update(payload: {
    id: string;
    title?: string;
    description?: string;
    price?: number;
    stock?: number;
    status?: ProductStatus;
    coverUrl?: string;
  }) {
    const existing = await this.prisma.product.findUnique({
      where: { id: payload.id },
    });

    if (!existing) {
      throw rpcError('Product not found', HttpStatus.NOT_FOUND);
    }

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

  async delete(payload: { id: string }) {
    await this.prisma.product.delete({ where: { id: payload.id } });
    return { message: 'Product deleted' };
  }

  async findOne(payload: { id: string }) {
    const product = await this.prisma.product.findUnique({
      where: { id: payload.id },
    });

    if (!product) {
      throw rpcError('Product not found', HttpStatus.NOT_FOUND);
    }

    return this.mapProduct(product);
  }

  async list() {
    const products = await this.prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return products.map((product) => this.mapProduct(product));
  }

  async checkAndReserveStock(payload: {
    items: Array<{ productId: string; quantity: number }>;
  }) {
    if (payload.items.length === 0) {
      throw rpcError('Order items cannot be empty');
    }

    return this.prisma.$transaction(async (tx) => {
      const snapshots: Array<{
        productId: string;
        snapshotTitle: string;
        snapshotPrice: number;
        quantity: number;
        subtotal: number;
      }> = [];

      let totalAmount = 0;

      for (const item of payload.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product || product.status !== ProductStatus.ACTIVE) {
          throw rpcError(`Product ${item.productId} is unavailable`, HttpStatus.BAD_REQUEST);
        }

        if (product.stock < item.quantity) {
          throw rpcError(`Insufficient stock for ${product.title}`, HttpStatus.BAD_REQUEST);
        }

        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: item.quantity } },
        });

        const snapshotPrice = decimalToNumber(product.price);
        const subtotal = snapshotPrice * item.quantity;
        totalAmount += subtotal;

        snapshots.push({
          productId: product.id,
          snapshotTitle: product.title,
          snapshotPrice,
          quantity: item.quantity,
          subtotal,
        });
      }

      return {
        items: snapshots,
        totalAmount,
      };
    });
  }

  async releaseStock(payload: {
    items: Array<{ productId: string; quantity: number }>;
  }) {
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
    return {
      ...product,
      price: decimalToNumber(product.price),
    };
  }
}
