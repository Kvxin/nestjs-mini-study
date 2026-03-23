import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ORDER_PATTERNS } from '../../../libs/contracts/messages';
import { OrderServiceService } from './order.service';

@Controller()
export class OrderServiceController {
  constructor(private readonly orderService: OrderServiceService) {}

  @MessagePattern(ORDER_PATTERNS.CREATE)
  create(
    @Payload() payload: {
      userId: string;
      items: Array<{ productId: string; quantity: number }>;
    },
  ) {
    return this.orderService.create(payload);
  }

  @MessagePattern(ORDER_PATTERNS.FIND_ONE)
  findOne(
    @Payload() payload: { orderId: string; userId: string; role: 'USER' | 'ADMIN' },
  ) {
    return this.orderService.findOne(payload);
  }

  @MessagePattern(ORDER_PATTERNS.FIND_MINE)
  findMine(@Payload() payload: { userId: string }) {
    return this.orderService.findMine(payload);
  }

  @MessagePattern(ORDER_PATTERNS.FIND_ALL)
  findAll() {
    return this.orderService.findAll();
  }

  @MessagePattern(ORDER_PATTERNS.MARK_PAID)
  markPaid(@Payload() payload: { paymentId: string; paymentNo: string }) {
    return this.orderService.markPaid(payload);
  }
}
