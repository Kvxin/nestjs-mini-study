import { Controller, Get, Inject, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { requestFromClient } from '../../../../libs/common/rpc';
import {
  CLIENT_TOKENS,
  PAYMENT_PATTERNS,
} from '../../../../libs/contracts/messages';
import { AccessAuthGuard } from '../auth/access-auth.guard';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(AccessAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(
    @Inject(CLIENT_TOKENS.PAYMENT_SERVICE)
    private readonly paymentClient: ClientProxy,
  ) {}

  @Get(':paymentId/qrcode')
  @ApiOperation({ summary: 'Get payment detail and QR code data' })
  findQrCode(@Param('paymentId') paymentId: string) {
    return requestFromClient(
      this.paymentClient.send(PAYMENT_PATTERNS.FIND_BY_ID, { paymentId }),
    );
  }
}
