import { Controller, Get, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { PaymentServiceService } from './payment.service';

@Controller('payments/page')
export class PaymentPageController {
  constructor(private readonly paymentService: PaymentServiceService) {}

  @Get(':paymentNo')
  async getPaymentPage(
    @Param('paymentNo') paymentNo: string,
    @Res() response: Response,
  ) {
    const payment = await this.paymentService.findByNo({ paymentNo });
    response.type('html').send(this.paymentService.renderPaymentPage(payment));
  }

  @Post(':paymentNo/confirm')
  async confirmPayment(
    @Param('paymentNo') paymentNo: string,
    @Res() response: Response,
  ) {
    const result = await this.paymentService.confirmSuccess({ paymentNo });
    response
      .type('html')
      .send(
        `<!doctype html><html><body style="font-family:Arial,sans-serif;padding:40px"><h1>${result.message}</h1><p>Payment No: ${result.payment.paymentNo}</p><p>Status: ${result.payment.status}</p><p><a href="/payments/page/${result.payment.paymentNo}">Back to payment page</a></p></body></html>`,
      );
  }
}
