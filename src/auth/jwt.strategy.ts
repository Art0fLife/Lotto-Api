import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma.service';
import { getJwtSecret } from './auth.config';

export type JwtPayload = {
  sub: number;
  email: string;
  roleId: number;
  name: string;
  sessionId: string;
  deviceId: string;
  tokenType: 'access' | 'refresh';
  sessionExpiresAt?: number;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.tokenType !== 'access') {
      throw new UnauthorizedException('Invalid access token');
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (!payload.sessionExpiresAt || payload.sessionExpiresAt <= nowSeconds) {
      throw new UnauthorizedException('Session expired');
    }

    const [admin, session] = await Promise.all([
      this.prisma.admin.findFirst({
        where: {
          id: payload.sub,
          status: 1,
          deletedAt: null,
        },
        select: { id: true },
      }),
      (this.prisma as any).adminSession.findFirst({
        where: {
          id: payload.sessionId,
          adminId: payload.sub,
          deviceId: payload.deviceId,
          revokedAt: null,
          sessionExpiresAt: {
            gt: new Date(nowSeconds * 1000),
          },
        },
        select: { id: true },
      }),
    ]);

    if (!admin || !session) {
      throw new UnauthorizedException('Session expired');
    }

    return payload;
  }
}
