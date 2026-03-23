import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PRODUCT_PATTERNS } from '../../../libs/contracts/messages';
import { ProductServiceService } from './product.service';

@Controller()
export class ProductServiceController {
  constructor(private readonly productService: ProductServiceService) {}

  @MessagePattern(PRODUCT_PATTERNS.CREATE)
  create(@Payload() payload: Parameters<ProductServiceService['create']>[0]) {
    return this.productService.create(payload);
  }

  @MessagePattern(PRODUCT_PATTERNS.UPDATE)
  update(@Payload() payload: Parameters<ProductServiceService['update']>[0]) {
    return this.productService.update(payload);
  }

  @MessagePattern(PRODUCT_PATTERNS.DELETE)
  delete(@Payload() payload: { id: string }) {
    return this.productService.delete(payload);
  }

  @MessagePattern(PRODUCT_PATTERNS.FIND_ONE)
  findOne(@Payload() payload: { id: string }) {
    return this.productService.findOne(payload);
  }

  @MessagePattern(PRODUCT_PATTERNS.LIST)
  list() {
    return this.productService.list();
  }

  @MessagePattern(PRODUCT_PATTERNS.CHECK_AND_RESERVE_STOCK)
  checkAndReserveStock(
    @Payload() payload: { items: Array<{ productId: string; quantity: number }> },
  ) {
    return this.productService.checkAndReserveStock(payload);
  }

  @MessagePattern(PRODUCT_PATTERNS.RELEASE_STOCK)
  releaseStock(
    @Payload() payload: { items: Array<{ productId: string; quantity: number }> },
  ) {
    return this.productService.releaseStock(payload);
  }
}
