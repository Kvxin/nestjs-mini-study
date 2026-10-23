import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PAYMENT_PATTERNS } from '../../../libs/contracts/messages';
import { PaymentServiceService } from './payment.service';

@Controller()
export class PaymentServiceController {
  constructor(
    @Inject(PaymentServiceService)
    private readonly paymentService: PaymentServiceService,
  ) {}

  @MessagePattern(PAYMENT_PATTERNS.CREATE_FOR_ORDER)
  createForOrder(
    @Payload() payload: { orderId: string; orderNo: string; amount: number },
  ) {
    return this.paymentService.createForOrder(payload);
  }

  @MessagePattern(PAYMENT_PATTERNS.FIND_BY_ID)
  findById(@Payload() payload: { paymentId: string }) {
    return this.paymentService.findById(payload);
  }

  @MessagePattern(PAYMENT_PATTERNS.FIND_BY_NO)
  findByNo(@Payload() payload: { paymentNo: string }) {
    return this.paymentService.findByNo(payload);
  }

  @MessagePattern(PAYMENT_PATTERNS.CONFIRM_SUCCESS)
  confirmSuccess(@Payload() payload: { paymentNo: string }) {
    return this.paymentService.confirmSuccess(payload);
  }
}
