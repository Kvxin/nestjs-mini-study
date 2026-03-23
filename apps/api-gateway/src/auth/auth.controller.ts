import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response } from 'express';
import { requestFromClient } from '../../../../libs/common/rpc';
import { REFRESH_TOKEN_COOKIE } from '../../../../libs/common/tokens';
import {
  CLIENT_TOKENS,
  USER_PATTERNS,
} from '../../../../libs/contracts/messages';
import {
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
  RegisterDto,
} from './auth.dto';
import { AccessAuthGuard } from './access-auth.guard';
import { UseGuards } from '@nestjs/common';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(CLIENT_TOKENS.USER_SERVICE)
    private readonly userClient: ClientProxy,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register user and issue access/refresh tokens' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await requestFromClient(
      this.userClient.send(USER_PATTERNS.REGISTER, dto),
    );
    this.setRefreshTokenCookie(res, result.refreshToken);
    return result;
  }

  @HttpCode(200)
  @Post('login')
  @ApiOperation({ summary: 'Login and issue access/refresh tokens' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await requestFromClient(
      this.userClient.send(USER_PATTERNS.LOGIN, dto),
    );
    this.setRefreshTokenCookie(res, result.refreshToken);
    return result;
  }

  @HttpCode(200)
  @Post('refresh')
  @ApiCookieAuth(REFRESH_TOKEN_COOKIE)
  @ApiOperation({ summary: 'Refresh access token with refresh token or cookie' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = dto.refreshToken ?? req.cookies?.[REFRESH_TOKEN_COOKIE];
    const result = await requestFromClient(
      this.userClient.send(USER_PATTERNS.REFRESH_TOKEN, {
        refreshToken,
        deviceInfo: dto.deviceInfo,
      }),
    );
    this.setRefreshTokenCookie(res, result.refreshToken);
    return result;
  }

  @HttpCode(200)
  @Post('logout')
  @ApiCookieAuth(REFRESH_TOKEN_COOKIE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke current refresh token session' })
  @UseGuards(AccessAuthGuard)
  async logout(
    @Body() dto: LogoutDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = dto.refreshToken ?? req.cookies?.[REFRESH_TOKEN_COOKIE];
    const result = await requestFromClient(
      this.userClient.send(USER_PATTERNS.LOGOUT, {
        refreshToken,
      }),
    );
    res.clearCookie(REFRESH_TOKEN_COOKIE);
    return result;
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string) {
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
