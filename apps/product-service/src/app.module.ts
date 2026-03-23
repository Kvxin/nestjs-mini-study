import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../../libs/prisma/prisma.module';
import { ProductServiceController } from './product.controller';
import { ProductServiceService } from './product.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }), PrismaModule],
  controllers: [ProductServiceController],
  providers: [ProductServiceService],
})
export class ProductServiceAppModule {}
