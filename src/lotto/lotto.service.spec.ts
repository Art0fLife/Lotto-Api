import { Test, TestingModule } from '@nestjs/testing';
import { LimitNumbersService } from '../limit-numbers/limit-numbers.service';
import { PrismaService } from '../prisma.service';
import { LottoService } from './lotto.service';

describe('LottoService', () => {
  let service: LottoService;

  const mockPrisma = {
    lottoTicket: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    lottoCategory: {
      findMany: jest.fn(),
    },
    bill: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    bet: {
      updateMany: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    limitNumber: {
      findMany: jest.fn(),
    },
    withDeleted: jest.fn(),
    onlyDeleted: jest.fn(),
    restore: jest.fn(),
    forceDelete: jest.fn(),
    forceDeleteMany: jest.fn(),
  };

  const mockLimitNumbersService = {
    getLimitCodesForTicket: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LottoService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LimitNumbersService, useValue: mockLimitNumbersService },
      ],
    }).compile();

    service = module.get<LottoService>(LottoService);
  });

  it('flistRewardNumber validates formats', async () => {
    await expect(service.flistRewardNumber('12345', '12')).rejects.toThrow(
      'Reward number must be a 6-digit string',
    );
    await expect(service.flistRewardNumber('123456', '1')).rejects.toThrow(
      'Reward number bottom must be a 2-digit string',
    );
  });

  it('flistRewardNumber creates expected groups', async () => {
    const result = await service.flistRewardNumber('123456', '78');

    expect(result[1]).toBe('56');
    expect(result[2]).toBe('78');
    expect(result[3]).toBe('456');
    expect(result[5]).toContain('465');
    expect(result[6]).toEqual(['4', '5', '6']);
    expect(result[7]).toEqual(['7', '8']);
  });

  it('findOnlyAllow returns ticket with limit numbers', async () => {
    mockPrisma.lottoTicket.findFirst.mockResolvedValue({ id: 9, title: 'T', status: 1 });
    mockPrisma.limitNumber.findMany.mockResolvedValue([{ code: '12' }, { code: '34' }]);

    const result = await service.findOnlyAllow();

    expect(result).toEqual({ id: 9, title: 'T', status: 1, limitNumbers: ['12', '34'] });
  });

  it('update status=3 calculates winnerAmount and updates bill totals', async () => {
    mockPrisma.lottoTicket.update.mockResolvedValue({ id: 5, status: 3 });
    mockPrisma.bill.findMany.mockResolvedValue([{ id: 101 }]);
    mockPrisma.bet.updateMany.mockResolvedValue({ count: 1 });
    mockLimitNumbersService.getLimitCodesForTicket.mockResolvedValue(new Set(['4']));
    mockPrisma.bet.findMany.mockImplementation(({ where }: any) => {
      if (where.lottoCategoryId === 6) {
        return Promise.resolve([{ id: BigInt(1), amount: 10, code: '4' }]);
      }
      return Promise.resolve([]);
    });
    mockPrisma.bet.update.mockResolvedValue({});
    mockPrisma.bet.aggregate.mockResolvedValue({ _sum: { winnerAmount: 15 } });
    mockPrisma.bill.update.mockResolvedValue({});

    await service.update(5, { status: 3, rewardNumber: '123456', rewardNumberBottom: '78' });

    expect(mockPrisma.bet.updateMany).toHaveBeenCalledWith({
      where: { billId: { in: [BigInt(101)] }, deletedAt: null },
      data: { winnerAmount: 0, isLimitNumber: 0 },
    });
    expect(mockPrisma.bet.update).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      data: { winnerAmount: 15, isLimitNumber: 1 },
    });
    expect(mockPrisma.bill.update).toHaveBeenCalledWith({
      where: { id: 101 },
      data: { totalWinner: 15 },
    });
  });
});
