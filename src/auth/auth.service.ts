import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { getJwtExpiresIn, getJwtRefreshExpiresIn, getJwtRefreshSecret, getJwtSecret, getJwtSessionMaxAgeSeconds } from './auth.config';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private resolveSessionExpiresAt(sessionExpiresAt?: number) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const sessionMaxAgeSeconds = getJwtSessionMaxAgeSeconds();

    return sessionExpiresAt && sessionExpiresAt > nowSeconds
      ? sessionExpiresAt
      : nowSeconds + sessionMaxAgeSeconds;
  }

  private async signTokens(admin: {
    id: number;
    email: string;
    roleId: number;
    name: string;
  }, session: { sessionId: string; deviceId: string; sessionExpiresAt: number }) {
    const effectiveSessionExpiresAt = session.sessionExpiresAt;

    const accessPayload: JwtPayload = {
      sub: admin.id,
      email: admin.email,
      roleId: admin.roleId,
      name: admin.name,
      sessionId: session.sessionId,
      deviceId: session.deviceId,
      tokenType: 'access',
      sessionExpiresAt: effectiveSessionExpiresAt,
    };

    const refreshPayload: JwtPayload = {
      ...accessPayload,
      tokenType: 'refresh',
    };

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: getJwtSecret(),
      expiresIn: getJwtExpiresIn(),
    });

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: getJwtRefreshSecret(),
      expiresIn: getJwtRefreshExpiresIn(),
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  private async createAdminSession(adminId: number, deviceId: string, sessionExpiresAt: number) {
    await this.prisma.adminSession.updateMany({
      where: {
        adminId,
        deviceId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return this.prisma.adminSession.create({
      data: {
        adminId,
        deviceId,
        sessionExpiresAt: new Date(sessionExpiresAt * 1000),
      },
    });
  }

  private async storeRefreshToken(sessionId: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);
    await this.prisma.adminSession.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash: hashedRefreshToken,
      },
    });
  }

  private async issueTokensForDevice(admin: {
    id: number;
    email: string;
    roleId: number;
    name: string;
  }, deviceId: string, sessionExpiresAt?: number) {
    const effectiveSessionExpiresAt = this.resolveSessionExpiresAt(sessionExpiresAt);
    const session = await this.createAdminSession(admin.id, deviceId, effectiveSessionExpiresAt);
    const tokens = await this.signTokens(admin, {
      sessionId: session.id,
      deviceId: session.deviceId,
      sessionExpiresAt: effectiveSessionExpiresAt,
    });

    await this.storeRefreshToken(session.id, tokens.refresh_token);

    return tokens;
  }

  async login(loginDto: LoginDto) {
    const admin = await this.prisma.admin.findFirst({
      where: {
        email: loginDto.email,
        status: 1,
        deletedAt: null,
      },
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatched = await bcrypt.compare(loginDto.password, admin.password);
    if (!passwordMatched) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.issueTokensForDevice(admin, loginDto.deviceId);

    return {
      ...tokens,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        roleId: admin.roleId,
        status: admin.status,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const existingAdmin = await this.prisma.admin.findFirst({
      where: {
        email: registerDto.email,
      },
    });

    if (existingAdmin) {
      throw new BadRequestException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    const admin = await this.prisma.admin.create({
      data: {
        name: registerDto.name,
        email: registerDto.email,
        password: hashedPassword,
        roleId: 2,
        status: 1,
      },
    });

    return {
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        roleId: admin.roleId,
        status: admin.status,
      },
    };
  }

  async refresh(refreshToken: string, deviceId: string) {
    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: getJwtRefreshSecret(),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.tokenType !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
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
      }),
      this.prisma.adminSession.findFirst({
        where: {
          id: payload.sessionId,
          adminId: payload.sub,
          deviceId,
          revokedAt: null,
        },
      }),
    ]);

    if (!admin || !session || payload.deviceId !== deviceId || !session.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const refreshTokenMatched = await bcrypt.compare(refreshToken, session.refreshTokenHash);
    if (!refreshTokenMatched) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.signTokens(admin, {
      sessionId: session.id,
      deviceId: session.deviceId,
      sessionExpiresAt: payload.sessionExpiresAt,
    });
    await this.storeRefreshToken(session.id, tokens.refresh_token);

    return tokens;
  }

  async me(adminId: number) {
    const admin = await this.prisma.admin.findFirst({
      where: {
        id: adminId,
        status: 1,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        roleId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!admin) {
      throw new UnauthorizedException('User not found');
    }

    return admin;
  }

  async logout(adminId: number, sessionId: string, allDevices = false) {
    if (allDevices) {
      await this.prisma.adminSession.updateMany({
        where: {
          adminId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    } else {
      await this.prisma.adminSession.updateMany({
        where: {
          id: sessionId,
          adminId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }

    return {
      success: true,
      scope: allDevices ? 'all-devices' : 'current-device',
    };
  }
}
