import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_PATTERNS } from '../../../libs/contracts/messages';
import { UserServiceService } from './user.service';

@Controller()
export class UserServiceController {
  constructor(
    @Inject(UserServiceService)
    private readonly userService: UserServiceService,
  ) {}

  @MessagePattern(USER_PATTERNS.REGISTER)
  register(@Payload() payload: { email: string; password: string; deviceInfo?: string }) {
    return this.userService.register(payload);
  }

  @MessagePattern(USER_PATTERNS.LOGIN)
  login(@Payload() payload: { email: string; password: string; deviceInfo?: string }) {
    return this.userService.login(payload);
  }

  @MessagePattern(USER_PATTERNS.REFRESH_TOKEN)
  refreshToken(@Payload() payload: { refreshToken: string; deviceInfo?: string }) {
    return this.userService.refreshToken(payload);
  }

  @MessagePattern(USER_PATTERNS.LOGOUT)
  logout(@Payload() payload: { refreshToken: string }) {
    return this.userService.logout(payload);
  }

  @MessagePattern(USER_PATTERNS.GET_PROFILE)
  getProfile(@Payload() payload: { userId: string }) {
    return this.userService.getProfile(payload);
  }
}
