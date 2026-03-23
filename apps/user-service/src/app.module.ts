import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../../libs/prisma/prisma.module';
import { UserServiceController } from './user.controller';
import { UserServiceService } from './user.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    JwtModule.register({}),
    PrismaModule,
  ],
  controllers: [UserServiceController],
  providers: [UserServiceService],
})
export class UserServiceAppModule {}
