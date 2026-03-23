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

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(AccessAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    @Inject(CLIENT_TOKENS.ORDER_SERVICE)
    private readonly orderClient: ClientProxy,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create order and payment' })
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: { sub: string },
  ) {
    return requestFromClient(
      this.orderClient.send(ORDER_PATTERNS.CREATE, {
        userId: user.sub,
        items: dto.items,
      }),
    );
  }

  @Get('me')
  @ApiOperation({ summary: 'List current user orders' })
  findMine(@CurrentUser() user: { sub: string }) {
    return requestFromClient(
      this.orderClient.send(ORDER_PATTERNS.FIND_MINE, { userId: user.sub }),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order detail' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string; role: 'USER' | 'ADMIN' },
  ) {
    return requestFromClient(
      this.orderClient.send(ORDER_PATTERNS.FIND_ONE, {
        orderId: id,
        userId: user.sub,
        role: user.role,
      }),
    );
  }
}
