import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../libs/prisma/prisma.service';
import { JwtPayload } from '../../../libs/contracts/messages';
import { rpcError } from '../../../libs/common/rpc';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import ms, { StringValue } from 'ms';

interface AuthPayload {
  email: string;
  password: string;
  deviceInfo?: string;
}

@Injectable()
export class UserServiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(payload: AuthPayload) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (existingUser) {
      throw rpcError('Email already registered', HttpStatus.CONFLICT);
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: payload.email,
        passwordHash,
      },
    });

    return this.buildAuthResponse(user, payload.deviceInfo);
  }

  async login(payload: AuthPayload) {
    const user = await this.prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!user) {
      throw rpcError('Invalid email or password', HttpStatus.UNAUTHORIZED);
    }

    const isPasswordValid = await bcrypt.compare(
      payload.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw rpcError('Invalid email or password', HttpStatus.UNAUTHORIZED);
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw rpcError('User has been disabled', HttpStatus.FORBIDDEN);
    }

    return this.buildAuthResponse(user, payload.deviceInfo);
  }

  async refreshToken(payload: { refreshToken: string; deviceInfo?: string }) {
    const decoded = await this.verifyToken(payload.refreshToken, 'refresh');
    const sessions = await this.prisma.refreshTokenSession.findMany({
      where: {
        userId: decoded.sub,
        revokedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    const matchedSession = await this.findMatchingSession(
      payload.refreshToken,
      sessions,
    );

    if (!matchedSession) {
      throw rpcError('Refresh token is invalid or revoked', HttpStatus.UNAUTHORIZED);
    }

    if (matchedSession.expiresAt.getTime() < Date.now()) {
      throw rpcError('Refresh token has expired', HttpStatus.UNAUTHORIZED);
    }

    await this.prisma.refreshTokenSession.update({
      where: { id: matchedSession.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user) {
      throw rpcError('User not found', HttpStatus.NOT_FOUND);
    }

    return this.buildAuthResponse(user, payload.deviceInfo);
  }

  async logout(payload: { refreshToken: string }) {
    const sessions = await this.prisma.refreshTokenSession.findMany({
      where: { revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    const matchedSession = await this.findMatchingSession(
      payload.refreshToken,
      sessions,
    );

    if (matchedSession) {
      await this.prisma.refreshTokenSession.update({
        where: { id: matchedSession.id },
        data: { revokedAt: new Date() },
      });
    }

    return { message: 'Logout successful' };
  }

  async getProfile(payload: { userId: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw rpcError('User not found', HttpStatus.NOT_FOUND);
    }

    return user;
  }

  private async buildAuthResponse(
    user: { id: string; email: string; role: UserRole },
    deviceInfo?: string,
  ) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessExpiresIn = this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    ) as StringValue;
    const refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    ) as StringValue;

    const accessToken = await this.jwtService.signAsync(payload as object, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: accessExpiresIn,
    });

    const refreshToken = await this.jwtService.signAsync(payload as object, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshExpiresIn,
    });

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + ms(refreshExpiresIn));

    await this.prisma.refreshTokenSession.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        deviceInfo,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  private async verifyToken(token: string, type: 'access' | 'refresh') {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret:
          type === 'access'
            ? this.configService.getOrThrow<string>('JWT_ACCESS_SECRET')
            : this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw rpcError(`${type} token is invalid`, HttpStatus.UNAUTHORIZED);
    }
  }

  private async findMatchingSession(
    refreshToken: string,
    sessions: Array<{ id: string; tokenHash: string; expiresAt: Date }>,
  ) {
    for (const session of sessions) {
      const isMatch = await bcrypt.compare(refreshToken, session.tokenHash);
      if (isMatch) {
        return session;
      }
    }

    return null;
  }
}
