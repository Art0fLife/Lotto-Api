import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const mockPrisma = {
    admin: {
      findFirst: jest.fn(),
    },
    adminSession: {
      findFirst: jest.fn(),
    },
  };

  let strategy: JwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    strategy = new JwtStrategy(mockPrisma as any);
  });

  it('rejects expired absolute sessions', async () => {
    await expect(
      strategy.validate({
        sub: 1,
        email: 'admin@example.com',
        roleId: 1,
        name: 'Admin',
        sessionId: 'session-1',
        deviceId: 'device-1',
        tokenType: 'access',
        sessionExpiresAt: Math.floor(Date.now() / 1000) - 1,
      }),
    ).rejects.toThrow(new UnauthorizedException('Session expired'));
  });

  it('returns payload for active user and session', async () => {
    const payload = {
      sub: 1,
      email: 'admin@example.com',
      roleId: 1,
      name: 'Admin',
      sessionId: 'session-1',
      deviceId: 'device-1',
      tokenType: 'access' as const,
      sessionExpiresAt: Math.floor(Date.now() / 1000) + 3600,
    };

    mockPrisma.admin.findFirst.mockResolvedValue({ id: 1 });
    mockPrisma.adminSession.findFirst.mockResolvedValue({ id: 'session-1' });

    await expect(strategy.validate(payload)).resolves.toEqual(payload);
  });

  it('rejects revoked or missing sessions', async () => {
    mockPrisma.admin.findFirst.mockResolvedValue({ id: 1 });
    mockPrisma.adminSession.findFirst.mockResolvedValue(null);

    await expect(
      strategy.validate({
        sub: 1,
        email: 'admin@example.com',
        roleId: 1,
        name: 'Admin',
        sessionId: 'session-1',
        deviceId: 'device-1',
        tokenType: 'access',
        sessionExpiresAt: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).rejects.toThrow(new UnauthorizedException('Session expired'));
  });
});