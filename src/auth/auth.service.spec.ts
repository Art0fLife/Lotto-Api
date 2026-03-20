import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

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

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_EXPIRES_IN = '1d';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    process.env.JWT_SESSION_MAX_AGE_SECONDS = '86400';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('creates a new device session and stores a rotated refresh token hash', async () => {
      mockPrisma.admin.findFirst.mockResolvedValue({
        id: 1,
        email: 'admin@example.com',
        name: 'Admin',
        password: 'hashed-password',
        roleId: 1,
        status: 1,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.adminSession.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.adminSession.create.mockResolvedValue({
        id: 'session-1',
        adminId: 1,
        deviceId: 'device-1',
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh-token');
      mockPrisma.adminSession.update.mockResolvedValue({ id: 'session-1' });

      const result = await service.login({
        email: 'admin@example.com',
        password: 'secret',
        deviceId: 'device-1',
      });

      expect(mockPrisma.adminSession.updateMany).toHaveBeenCalledWith({
        where: { adminId: 1, deviceId: 'device-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(mockPrisma.adminSession.create).toHaveBeenCalledWith({
        data: {
          adminId: 1,
          deviceId: 'device-1',
          sessionExpiresAt: expect.any(Date),
        },
      });
      expect(mockPrisma.adminSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { refreshTokenHash: 'hashed-refresh-token' },
      });
      expect(result).toEqual({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: {
          id: 1,
          email: 'admin@example.com',
          name: 'Admin',
          roleId: 1,
          status: 1,
        },
      });
    });

    it('throws when credentials are invalid', async () => {
      mockPrisma.admin.findFirst.mockResolvedValue(null);

      await expect(
        service.login({ email: 'missing@example.com', password: 'secret', deviceId: 'device-1' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
    });
  });

  describe('register', () => {
    it('creates a user without issuing auth tokens', async () => {
      mockPrisma.admin.findFirst.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockPrisma.admin.create.mockResolvedValue({
        id: 9,
        email: 'new@example.com',
        name: 'New User',
        roleId: 2,
        status: 1,
      });

      const result = await service.register({
        name: 'New User',
        email: 'new@example.com',
        password: 'password123',
      });

      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
      expect(result).toEqual({
        user: {
          id: 9,
          email: 'new@example.com',
          name: 'New User',
          roleId: 2,
          status: 1,
        },
      });
    });

    it('rejects duplicate email', async () => {
      mockPrisma.admin.findFirst.mockResolvedValue({ id: 1 });

      await expect(
        service.register({ name: 'Dup', email: 'dup@example.com', password: 'password123' }),
      ).rejects.toThrow(new BadRequestException('Email already in use'));
    });
  });

  describe('refresh', () => {
    it('rotates tokens for the same active device session', async () => {
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

      const result = await service.refresh('old-refresh-token', 'device-1');

      expect(mockPrisma.adminSession.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'session-1',
          adminId: 1,
          deviceId: 'device-1',
          revokedAt: null,
        },
      });
      expect(mockPrisma.adminSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { refreshTokenHash: 'new-refresh-hash' },
      });
      expect(result).toEqual({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      });
    });

    it('rejects refresh from a different device id', async () => {
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
      mockPrisma.adminSession.findFirst.mockResolvedValue(null);

      await expect(service.refresh('old-refresh-token', 'device-2')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });
  });

  describe('logout', () => {
    it('revokes only the current device session by default', async () => {
      mockPrisma.adminSession.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.logout(1, 'session-1');

      expect(mockPrisma.adminSession.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'session-1',
          adminId: 1,
          revokedAt: null,
        },
        data: { revokedAt: expect.any(Date) },
      });
      expect(result).toEqual({ success: true, scope: 'current-device' });
    });

    it('revokes all device sessions when requested', async () => {
      mockPrisma.adminSession.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.logout(1, 'session-1', true);

      expect(mockPrisma.adminSession.updateMany).toHaveBeenCalledWith({
        where: {
          adminId: 1,
          revokedAt: null,
        },
        data: { revokedAt: expect.any(Date) },
      });
      expect(result).toEqual({ success: true, scope: 'all-devices' });
    });
  });
});