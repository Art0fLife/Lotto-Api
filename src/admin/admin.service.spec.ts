import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { AdminService } from './admin.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('AdminService', () => {
  let service: AdminService;

  const mockPrisma = {
    admin: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    withDeleted: jest.fn(),
    onlyDeleted: jest.fn(),
    restore: jest.fn(),
    restoreMany: jest.fn(),
    forceDelete: jest.fn(),
    forceDeleteMany: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('findAll returns only non-deleted admins', async () => {
    mockPrisma.admin.findMany.mockResolvedValue([{ id: 1 }]);

    await service.findAll();

    expect(mockPrisma.admin.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
    });
  });

  it('create hashes password and applies default role/status', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    mockPrisma.admin.create.mockResolvedValue({ id: 1 });

    await service.create({ name: 'A', email: 'a@example.com', password: 'secret' });

    expect(mockPrisma.admin.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'A',
        email: 'a@example.com',
        password: 'hashed-password',
        roleId: 2,
        status: 1,
      }),
    });
  });

  it('update re-hashes non-empty password', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
    mockPrisma.admin.update.mockResolvedValue({ id: 1 });

    await service.update(1, { password: 'new-secret', name: 'B' });

    expect(mockPrisma.admin.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        password: 'new-hash',
        name: 'B',
        updatedAt: expect.any(Date),
      }),
    });
  });
});
