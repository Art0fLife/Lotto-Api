import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;
  const model = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PrismaService();
    (service as any).admin = model;
  });

  it('withDeleted delegates calls without changing where clause', async () => {
    model.findMany.mockResolvedValue([{ id: 1 }]);

    const result = await service.withDeleted('admin').findMany({ where: { id: 1 } });

    expect(model.findMany).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(result).toEqual([{ id: 1 }]);
  });

  it('onlyDeleted appends deletedAt condition', async () => {
    model.findFirst.mockResolvedValue({ id: 2 });

    await service.onlyDeleted('admin').findFirst({ where: { id: 2 } });

    expect(model.findFirst).toHaveBeenCalledWith({
      where: {
        id: 2,
        deletedAt: { not: null },
      },
    });
  });

  it('restore and forceDelete call underlying prisma model', async () => {
    model.update.mockResolvedValue({ id: 9 });
    model.deleteMany.mockResolvedValue({ count: 1 });

    await service.restore('admin', 9);
    await service.forceDelete('admin', 9);

    expect(model.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: { deletedAt: null },
    });
    expect(model.deleteMany).toHaveBeenCalledWith({ where: { id: 9 } });
  });
});
