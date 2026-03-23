import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { requestFromClient } from '../../../../libs/common/rpc';
import {
  CLIENT_TOKENS,
  PRODUCT_PATTERNS,
} from '../../../../libs/contracts/messages';
import { AccessAuthGuard } from '../auth/access-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateProductDto, UpdateProductDto } from '../auth/auth.dto';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(
    @Inject(CLIENT_TOKENS.PRODUCT_SERVICE)
    private readonly productClient: ClientProxy,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List products' })
  list() {
    return requestFromClient(this.productClient.send(PRODUCT_PATTERNS.LIST, {}));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product detail' })
  findOne(@Param('id') id: string) {
    return requestFromClient(
      this.productClient.send(PRODUCT_PATTERNS.FIND_ONE, { id }),
    );
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AccessAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create product (admin)' })
  create(@Body() dto: CreateProductDto) {
    return requestFromClient(
      this.productClient.send(PRODUCT_PATTERNS.CREATE, dto),
    );
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AccessAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update product (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return requestFromClient(
      this.productClient.send(PRODUCT_PATTERNS.UPDATE, { id, ...dto }),
    );
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AccessAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete product (admin)' })
  delete(@Param('id') id: string) {
    return requestFromClient(
      this.productClient.send(PRODUCT_PATTERNS.DELETE, { id }),
    );
  }
}
