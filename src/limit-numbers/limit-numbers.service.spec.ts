import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma.service';
import { LimitNumbersService } from './limit-numbers.service';

describe('LimitNumbersService', () => {
  let service: LimitNumbersService;

  const mockPrisma = {
    limitNumber: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    lottoTicket: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LimitNumbersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LimitNumbersService>(LimitNumbersService);
  });

  it('findAllPaginated enriches with ticket status/title', async () => {
    mockPrisma.limitNumber.findMany.mockResolvedValue([
      { id: 1, lottoTicketId: 2, code: '12', createdAt: new Date() },
    ]);
    mockPrisma.limitNumber.count.mockResolvedValue(1);
    mockPrisma.lottoTicket.findMany.mockResolvedValue([{ id: 2, status: 1, title: 'Ticket A' }]);

    const result = await service.findAllPaginated(1, 10, '2', '12', 'id', 'asc');

    expect(result.data[0]).toEqual(
      expect.objectContaining({ lottoTicketId: 2, ticketStatus: 1, ticketTitle: 'Ticket A' }),
    );
  });

  it('createMany removes empty codes and uses skipDuplicates', async () => {
    mockPrisma.limitNumber.createMany.mockResolvedValue({ count: 1 });

    const result = await service.createMany([
      { lottoTicketId: 1, code: '12' },
      { lottoTicketId: 1, code: '   ' },
    ]);

    expect(mockPrisma.limitNumber.createMany).toHaveBeenCalledWith({
      data: [{ lottoTicketId: 1, code: '12' }],
      skipDuplicates: true,
    });
    expect(result).toEqual({ count: 1 });
  });

  it('deleteByCodes returns zero when incoming codes are empty', async () => {
    await expect(service.deleteByCodes(1, ['   '])).resolves.toEqual({ count: 0 });
    expect(mockPrisma.limitNumber.updateMany).not.toHaveBeenCalled();
  });

  it('getLimitCodesForTicket expands contiguous substrings', async () => {
    mockPrisma.limitNumber.findMany.mockResolvedValue([{ code: '123' }, { code: '45' }]);

    const result = await service.getLimitCodesForTicket(1);

    ['123', '12', '23', '1', '2', '3', '45', '4', '5'].forEach((code) => {
      expect(result.has(code)).toBe(true);
    });
  });
});
