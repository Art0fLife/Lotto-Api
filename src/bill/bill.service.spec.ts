import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma.service';
import { SummaryService } from '../summary/summary-service';
import { BillService } from './bill.service';

describe('BillService', () => {
  let service: BillService;

  const mockPrisma = {
    bill: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    bet: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    admin: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    lottoTicket: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    lottoCategory: {
      findMany: jest.fn(),
    },
    withDeleted: jest.fn(),
    onlyDeleted: jest.fn(),
    restore: jest.fn(),
    forceDelete: jest.fn(),
    forceDeleteMany: jest.fn(),
    restoreMany: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SummaryService, useValue: {} },
      ],
    }).compile();

    service = module.get<BillService>(BillService);
  });

  it('findAllPaginated applies role filter and winner filter', async () => {
    mockPrisma.bill.findMany.mockResolvedValue([]);
    mockPrisma.bill.count.mockResolvedValue(0);

    await service.findAllPaginated(1, 10, undefined, undefined, undefined, 7, 2, { isWinner: false });

    expect(mockPrisma.bill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          adminId: 7,
          totalWinner: 0,
        }),
      }),
    );
  });

  it('findAllPaginated enriches rows and maps sort fields', async () => {
    mockPrisma.bill.findMany.mockResolvedValue([
      { id: 5, adminId: 2, ticketId: 9, totalAmount: 100, totalWinner: 50, createdAt: new Date(), updatedAt: new Date() },
    ]);
    mockPrisma.bill.count.mockResolvedValue(1);
    mockPrisma.admin.findMany.mockResolvedValue([{ id: 2, name: 'Alice' }]);
    mockPrisma.lottoTicket.findMany.mockResolvedValue([
      { id: 9, title: 'Ticket A', startDate: null, endDate: null, status: 1 },
    ]);

    const result = await service.findAllPaginated(1, 10, undefined, ['billId', 'ticketTitle'], ['asc', 'desc']);

    expect(mockPrisma.bill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ id: 'asc' }, { ticketId: 'desc' }] }),
    );
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        billId: 5,
        adminName: 'Alice',
        ticketTitle: 'Ticket A',
      }),
    );
  });

  it('delete soft-deletes related bets then bill', async () => {
    mockPrisma.bet.updateMany.mockResolvedValue({ count: 3 });
    mockPrisma.bill.updateMany.mockResolvedValue({ count: 1 });

    await service.delete(8);

    expect(mockPrisma.bet.updateMany).toHaveBeenCalledWith({
      where: { billId: 8, deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
    expect(mockPrisma.bill.updateMany).toHaveBeenCalledWith({
      where: { id: 8, deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('findOneWithBets returns null when bill is missing', async () => {
    mockPrisma.bill.findFirst.mockResolvedValue(null);

    await expect(service.findOneWithBets(1)).resolves.toBeNull();
  });

  it('findOneWithBets enriches bets with category/admin/ticket metadata', async () => {
    mockPrisma.bill.findFirst.mockResolvedValue({ id: 3, adminId: 2, ticketId: 9, totalAmount: BigInt(100), totalWinner: 0 });
    mockPrisma.bet.findMany.mockResolvedValue([
      { id: BigInt(10), billId: BigInt(3), adminId: 2, rowNumber: 1, lottoCategoryId: 6, code: '1', amount: 10, isLimitNumber: 0, winnerAmount: 0, createdAt: new Date(), updatedAt: new Date() },
    ]);
    mockPrisma.lottoCategory.findMany.mockResolvedValue([{ id: 6, name: 'RUN TOP' }]);
    mockPrisma.admin.findFirst.mockResolvedValue({ name: 'Admin A' });
    mockPrisma.lottoTicket.findFirst.mockResolvedValue({ title: 'Ticket A', status: 1 });

    const result = await service.findOneWithBets(3);

    expect(result).toEqual(
      expect.objectContaining({
        adminName: 'Admin A',
        ticketTitle: 'Ticket A',
        bets: expect.arrayContaining([
          expect.objectContaining({
            id: '10',
            billId: '3',
            categoryName: 'RUN TOP',
          }),
        ]),
      }),
    );
  });
});
