import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { requestFromClient } from '../../../../libs/common/rpc';
import {
  CLIENT_TOKENS,
  USER_PATTERNS,
} from '../../../../libs/contracts/messages';
import { AccessAuthGuard } from '../auth/access-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    @Inject(CLIENT_TOKENS.USER_SERVICE)
    private readonly userClient: ClientProxy,
  ) {}

  @Get('me')
  @UseGuards(AccessAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@CurrentUser() user: { sub: string }) {
    return requestFromClient(
      this.userClient.send(USER_PATTERNS.GET_PROFILE, {
        userId: user.sub,
      }),
    );
  }
}
