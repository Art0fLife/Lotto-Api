import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const mockReflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  const makeContext = (roleId?: number) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: roleId ? { roleId } : undefined }),
      }),
    }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows request when no role metadata is set', () => {
    mockReflector.getAllAndOverride = jest.fn().mockReturnValue(undefined);
    const guard = new RolesGuard(mockReflector);

    expect(guard.canActivate(makeContext(2))).toBe(true);
  });

  it('allows request when role is included', () => {
    mockReflector.getAllAndOverride = jest.fn().mockReturnValue(['admin']);
    const guard = new RolesGuard(mockReflector);

    expect(guard.canActivate(makeContext(2))).toBe(true);
  });

  it('throws forbidden when role is missing', () => {
    mockReflector.getAllAndOverride = jest.fn().mockReturnValue(['superadmin']);
    const guard = new RolesGuard(mockReflector);

    expect(() => guard.canActivate(makeContext(2))).toThrow(
      new ForbiddenException('Insufficient role permissions'),
    );
  });
});
