import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { PrismaService } from '../prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthController', () => {
  let app: INestApplication;

  const mockPrisma = {
    admin: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    adminSession: {
      updateMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: (context: any) => {
      const requestRef = context.switchToHttp().getRequest();
      requestRef.user = { sub: 1, sessionId: 'session-1', roleId: 1 };
      return true;
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_EXPIRES_IN = '1d';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    process.env.JWT_SESSION_MAX_AGE_SECONDS = '86400';

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /api/auth/login returns tokens for a valid device-aware login request', async () => {
    mockPrisma.admin.findFirst.mockResolvedValue({
      id: 1,
      email: 'admin@example.com',
      name: 'Admin',
      password: 'hashed-password',
      roleId: 1,
      status: 1,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    mockPrisma.adminSession.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.adminSession.create.mockResolvedValue({ id: 'session-1', deviceId: 'device-1' });
    mockJwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh-token');
    mockPrisma.adminSession.update.mockResolvedValue({ id: 'session-1' });

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'secret123',
        deviceId: 'device-1',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.access_token).toBe('access-token');
        expect(body.refresh_token).toBe('refresh-token');
        expect(body.user.email).toBe('admin@example.com');
      });
  });

  it('POST /api/auth/login rejects requests without deviceId', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'secret123',
      })
      .expect(400);
  });

  it('POST /api/auth/refresh rotates tokens for the same device', async () => {
    const futureSessionExpiry = Math.floor(Date.now() / 1000) + 3600;

    mockJwtService.verifyAsync.mockResolvedValue({
      sub: 1,
      email: 'admin@example.com',
      roleId: 1,
      name: 'Admin',
      sessionId: 'session-1',
      deviceId: 'device-1',
      tokenType: 'refresh',
      sessionExpiresAt: futureSessionExpiry,
    });
    mockPrisma.admin.findFirst.mockResolvedValue({
      id: 1,
      email: 'admin@example.com',
      name: 'Admin',
      roleId: 1,
      status: 1,
    });
    mockPrisma.adminSession.findFirst.mockResolvedValue({
      id: 'session-1',
      adminId: 1,
      deviceId: 'device-1',
      refreshTokenHash: 'stored-hash',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    mockJwtService.signAsync
      .mockResolvedValueOnce('new-access-token')
      .mockResolvedValueOnce('new-refresh-token');
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-refresh-hash');
    mockPrisma.adminSession.update.mockResolvedValue({ id: 'session-1' });

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({
          refreshToken: 'old-refresh-token-value-12345',
        deviceId: 'device-1',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.access_token).toBe('new-access-token');
        expect(body.refresh_token).toBe('new-refresh-token');
      });
  });

  it('POST /api/auth/logout revokes only the current device session', async () => {
    mockPrisma.adminSession.updateMany.mockResolvedValue({ count: 1 });

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .send({ allDevices: false })
      .expect(201)
      .expect({ success: true, scope: 'current-device' });

    expect(mockPrisma.adminSession.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'session-1',
        adminId: 1,
        revokedAt: null,
      },
      data: { revokedAt: expect.any(Date) },
    });
  });
});