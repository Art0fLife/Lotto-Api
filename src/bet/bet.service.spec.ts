import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BetService } from './bet.service';
import { PrismaService } from '../prisma.service';
import { BetType, CreateBetsModalDto } from './dto/create-bets-modal.dto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeModalDto(rows: CreateBetsModalDto['rows']): CreateBetsModalDto {
  return { rows };
}

// ---------------------------------------------------------------------------
// Mock PrismaService
// ---------------------------------------------------------------------------

const mockBet = {
  createMany: jest.fn(),
  findMany: jest.fn(),
  findFirst: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  count: jest.fn(),
  aggregate: jest.fn(),
};

const mockPrisma = {
  // The service accesses bet via  (this.prisma as any).bet
  bet: mockBet,

  lottoTicket: {
    findFirst: jest.fn(),
  },
  bill: {
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  },
  admin: {
    findMany: jest.fn(),
  },
  lottoCategory: {
    findMany: jest.fn(),
  },
  $queryRaw: jest.fn(),
  // soft-delete helpers (not used in the tested methods but prevent errors)
  withDeleted: jest.fn(),
  onlyDeleted: jest.fn(),
  restore: jest.fn(),
  forceDelete: jest.fn(),
  forceDeleteMany: jest.fn(),
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('BetService', () => {
  let service: BetService;

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BetService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BetService>(BetService);
  });

  // -------------------------------------------------------------------------
  // createFromModal
  // -------------------------------------------------------------------------

  describe('createFromModal', () => {
    const ADMIN_ID = 1;

    describe('happy path', () => {
      it('should create bill and bets for TWO_DIGIT type with both top and bottom amounts', async () => {
        mockPrisma.lottoTicket.findFirst.mockResolvedValue({ id: 10 });
        mockPrisma.bill.create.mockResolvedValue({ id: 100, ticketId: 10, adminId: ADMIN_ID });
        mockBet.createMany.mockResolvedValue({ count: 2 });
        mockPrisma.bill.update.mockResolvedValue({});
        mockPrisma.bill.count.mockResolvedValue(3);

        const dto = makeModalDto([
          { betType: BetType.TWO_DIGIT, input1: '12', input2: 50, input3: 30 },
        ]);

        const result = await service.createFromModal(ADMIN_ID, dto);

        expect(result.success).toBe(true);
        expect(result.billId).toBe(100);
        expect(result.billNumber).toBe(3);
        expect(result.createdBetRows).toBe(1);
        expect(result.createdBetItems).toBe(2); // top + bottom
        expect(result.totalAmount).toBe(80);

        expect(mockBet.createMany).toHaveBeenCalledWith({
          data: expect.arrayContaining([
            expect.objectContaining({ lottoCategoryId: 1, code: '12', amount: 50 }), // TWO_DIGIT top
            expect.objectContaining({ lottoCategoryId: 2, code: '12', amount: 30 }), // TWO_DIGIT bottom
          ]),
        });
      });

      it('should create only top bet when input3 is absent', async () => {
        mockPrisma.lottoTicket.findFirst.mockResolvedValue({ id: 10 });
        mockPrisma.bill.create.mockResolvedValue({ id: 101, ticketId: 10, adminId: ADMIN_ID });
        mockBet.createMany.mockResolvedValue({ count: 1 });
        mockPrisma.bill.update.mockResolvedValue({});
        mockPrisma.bill.count.mockResolvedValue(1);

        const dto = makeModalDto([
          { betType: BetType.THREE_DIGIT, input1: '123', input2: 100 },
        ]);

        const result = await service.createFromModal(ADMIN_ID, dto);

        expect(result.createdBetItems).toBe(1);
        expect(result.totalAmount).toBe(100);

        expect(mockBet.createMany).toHaveBeenCalledWith({
          data: expect.arrayContaining([
            expect.objectContaining({ lottoCategoryId: 3, code: '123', amount: 100 }),
          ]),
        });
      });

      it('should create multiple bottom bets for THREE_DIGIT (3 ตัวโต๊ด)', async () => {
        mockPrisma.lottoTicket.findFirst.mockResolvedValue({ id: 10 });
        mockPrisma.bill.create.mockResolvedValue({ id: 110, ticketId: 10, adminId: ADMIN_ID });
        // for 3 distinct digits like '123' we expect 5 permutations (excluding exact)
        mockBet.createMany.mockResolvedValue({ count: 5 });
        mockPrisma.bill.update.mockResolvedValue({});
        mockPrisma.bill.count.mockResolvedValue(1);

        const dto = makeModalDto([
          { betType: BetType.THREE_DIGIT, input1: '123', input3: 100 },
        ]);

        const result = await service.createFromModal(ADMIN_ID, dto);

        expect(result.createdBetRows).toBe(1);
        expect(result.createdBetItems).toBe(5);
        expect(result.totalAmount).toBe(500); // 100 * 5 permutations

        expect(mockBet.createMany).toHaveBeenCalledWith({
          data: expect.arrayContaining([
            expect.objectContaining({ lottoCategoryId: 5, code: '132', amount: 100 }),
            expect.objectContaining({ lottoCategoryId: 5, code: '213', amount: 100 }),
            expect.objectContaining({ lottoCategoryId: 5, code: '231', amount: 100 }),
            expect.objectContaining({ lottoCategoryId: 5, code: '312', amount: 100 }),
            expect.objectContaining({ lottoCategoryId: 5, code: '321', amount: 100 }),
          ]),
        });
      });

      it('should create only bottom bet when input2 is absent', async () => {
        mockPrisma.lottoTicket.findFirst.mockResolvedValue({ id: 10 });
        mockPrisma.bill.create.mockResolvedValue({ id: 102, ticketId: 10, adminId: ADMIN_ID });
        mockBet.createMany.mockResolvedValue({ count: 1 });
        mockPrisma.bill.update.mockResolvedValue({});
        mockPrisma.bill.count.mockResolvedValue(2);

        const dto = makeModalDto([
          { betType: BetType.RUNNING, input1: '5', input3: 20 },
        ]);

        const result = await service.createFromModal(ADMIN_ID, dto);

        expect(result.createdBetItems).toBe(1);
        expect(result.totalAmount).toBe(20);

        expect(mockBet.createMany).toHaveBeenCalledWith({
          data: expect.arrayContaining([
            expect.objectContaining({ lottoCategoryId: 7, code: '5', amount: 20 }), // RUNNING bottom
          ]),
        });
      });

      it('should handle multiple rows and sum totalAmount correctly', async () => {
        mockPrisma.lottoTicket.findFirst.mockResolvedValue({ id: 10 });
        mockPrisma.bill.create.mockResolvedValue({ id: 103, ticketId: 10, adminId: ADMIN_ID });
        mockBet.createMany.mockResolvedValue({ count: 3 });
        mockPrisma.bill.update.mockResolvedValue({});
        mockPrisma.bill.count.mockResolvedValue(5);

        const dto = makeModalDto([
          { betType: BetType.TWO_DIGIT, input1: '11', input2: 100, input3: 50 },
          { betType: BetType.THREE_DIGIT, input1: '222', input2: 200 },
        ]);

        const result = await service.createFromModal(ADMIN_ID, dto);

        expect(result.createdBetRows).toBe(2);
        expect(result.createdBetItems).toBe(3); // 2 from first row + 1 from second
        expect(result.totalAmount).toBe(350);
      });
    });

    // -------------------------------------------------------------------------
    // resolveCategoryId mapping
    // -------------------------------------------------------------------------

    describe('resolveCategoryId mapping', () => {
      beforeEach(() => {
        mockPrisma.lottoTicket.findFirst.mockResolvedValue({ id: 10 });
        mockPrisma.bill.create.mockResolvedValue({ id: 200, ticketId: 10, adminId: ADMIN_ID });
        mockBet.createMany.mockResolvedValue({ count: 2 });
        mockPrisma.bill.update.mockResolvedValue({});
        mockPrisma.bill.count.mockResolvedValue(1);
      });

      const cases: Array<{ betType: BetType; position: 'top' | 'bottom'; expectedCategoryId: number }> = [
        { betType: BetType.TWO_DIGIT,   position: 'top',    expectedCategoryId: 1 },
        { betType: BetType.TWO_DIGIT,   position: 'bottom', expectedCategoryId: 2 },
        { betType: BetType.THREE_DIGIT, position: 'top',    expectedCategoryId: 3 },
        // { betType: BetType.THREE_DIGIT, position: 'bottom', expectedCategoryId: 5 },
        // 3 ตัวล่าง ยังไม่ใช้ จึงคอมเมนท์ไว้ก่อน
        { betType: BetType.RUNNING,     position: 'top',    expectedCategoryId: 6 },
        { betType: BetType.RUNNING,     position: 'bottom', expectedCategoryId: 7 },
      ];

      test.each(cases)(
        'betType=$betType position=$position → lottoCategoryId=$expectedCategoryId',
        async ({ betType, position, expectedCategoryId }) => {
          const dto = makeModalDto([
            position === 'top'
              ? { betType, input1: '1', input2: 10 }
              : { betType, input1: '1', input3: 10 },
          ]);

          await service.createFromModal(ADMIN_ID, dto);

          expect(mockBet.createMany).toHaveBeenCalledWith({
            data: expect.arrayContaining([
              expect.objectContaining({ lottoCategoryId: expectedCategoryId }),
            ]),
          });
        },
      );
    });

    // -------------------------------------------------------------------------
    // Validation errors
    // -------------------------------------------------------------------------

    describe('throws BadRequestException', () => {
      it('when no active ticket exists', async () => {
        mockPrisma.lottoTicket.findFirst.mockResolvedValue(null);

        const dto = makeModalDto([{ betType: BetType.TWO_DIGIT, input1: '12', input2: 10 }]);

        await expect(service.createFromModal(ADMIN_ID, dto)).rejects.toThrow(
          new BadRequestException('No active ticket found'),
        );
      });

      it('when input1 is empty', async () => {
        mockPrisma.lottoTicket.findFirst.mockResolvedValue({ id: 10 });

        const dto = makeModalDto([{ betType: BetType.TWO_DIGIT, input1: '', input2: 10 }]);

        await expect(service.createFromModal(ADMIN_ID, dto)).rejects.toThrow(BadRequestException);
      });

      it('when both input2 and input3 are missing', async () => {
        mockPrisma.lottoTicket.findFirst.mockResolvedValue({ id: 10 });

        const dto = makeModalDto([
          { betType: BetType.TWO_DIGIT, input1: '12' } as any,
        ]);

        await expect(service.createFromModal(ADMIN_ID, dto)).rejects.toThrow(BadRequestException);
      });

      it('when input1 contains non-digit characters', async () => {
        mockPrisma.lottoTicket.findFirst.mockResolvedValue({ id: 10 });

        const dto = makeModalDto([{ betType: BetType.TWO_DIGIT, input1: 'ab', input2: 10 }]);

        await expect(service.createFromModal(ADMIN_ID, dto)).rejects.toThrow(BadRequestException);
      });

      it('when input1 has more than 3 digits', async () => {
        mockPrisma.lottoTicket.findFirst.mockResolvedValue({ id: 10 });

        const dto = makeModalDto([{ betType: BetType.TWO_DIGIT, input1: '1234', input2: 10 }]);

        await expect(service.createFromModal(ADMIN_ID, dto)).rejects.toThrow(BadRequestException);
      });

      it('when input2 is zero', async () => {
        mockPrisma.lottoTicket.findFirst.mockResolvedValue({ id: 10 });

        const dto = makeModalDto([{ betType: BetType.TWO_DIGIT, input1: '12', input2: 0 }]);

        await expect(service.createFromModal(ADMIN_ID, dto)).rejects.toThrow(BadRequestException);
      });

      it('when input2 is negative', async () => {
        mockPrisma.lottoTicket.findFirst.mockResolvedValue({ id: 10 });

        const dto = makeModalDto([{ betType: BetType.TWO_DIGIT, input1: '12', input2: -5 }]);

        await expect(service.createFromModal(ADMIN_ID, dto)).rejects.toThrow(BadRequestException);
      });

      it('when input3 is not a positive integer', async () => {
        mockPrisma.lottoTicket.findFirst.mockResolvedValue({ id: 10 });

        const dto = makeModalDto([{ betType: BetType.TWO_DIGIT, input1: '12', input3: 0 }]);

        await expect(service.createFromModal(ADMIN_ID, dto)).rejects.toThrow(BadRequestException);
      });
    });
  });

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------

  describe('findAll', () => {
    it('should return all non-deleted bets (no role restriction for superadmin)', async () => {
      const rows = [{ id: BigInt(1), code: '12', amount: 100 }];
      mockBet.findMany.mockResolvedValue(rows);

      const result = await service.findAll(1, 1); // roleId=1 → superadmin, no adminId filter

      expect(mockBet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null } }),
      );
      expect(result).toEqual([{ id: '1', code: '12', amount: 100 }]); // BigInt serialized
    });

    it('should filter by adminId for non-superadmin roles', async () => {
      const rows = [{ id: BigInt(2), code: '55', amount: 200 }];
      mockBet.findMany.mockResolvedValue(rows);

      await service.findAll(5, 2); // roleId=2 → agent, must filter by adminId

      expect(mockBet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null, adminId: 5 } }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // findAllPaginated
  // -------------------------------------------------------------------------

  describe('findAllPaginated', () => {
    it('should build safe numeric search filters for code and amount', async () => {
      mockBet.findMany.mockResolvedValue([]);
      mockBet.count.mockResolvedValue(0);

      await service.findAllPaginated(1, 10, '120');

      expect(mockBet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            OR: [{ code: { contains: '120' } }, { amount: { equals: 120 } }],
          }),
        }),
      );
    });

    it('should avoid numeric amount filter when search is not numeric', async () => {
      mockBet.findMany.mockResolvedValue([]);
      mockBet.count.mockResolvedValue(0);

      await service.findAllPaginated(1, 10, 'abc');

      expect(mockBet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            OR: [{ code: { contains: 'abc' } }],
          }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // findOne
  // -------------------------------------------------------------------------

  describe('findOne', () => {
    it('should return a single bet by id', async () => {
      const row = { id: BigInt(99), code: '77', amount: 50 };
      mockBet.findFirst.mockResolvedValue(row);

      const result = await service.findOne(BigInt(99));

      expect(mockBet.findFirst).toHaveBeenCalledWith({
        where: { id: BigInt(99), deletedAt: null },
      });
      expect(result).toEqual({ id: '99', code: '77', amount: 50 });
    });

    it('should return null when bet does not exist', async () => {
      mockBet.findFirst.mockResolvedValue(null);

      const result = await service.findOne(BigInt(999));

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // isAllowBet
  // -------------------------------------------------------------------------

  describe('isAllowBet', () => {
    it('should return true when there is an active ticket within date range', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ allow: true }]);

      const result = await service.isAllowBet();

      expect(result).toBe(true);
    });

    it('should return false when no active ticket exists', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ allow: false }]);

      const result = await service.isAllowBet();

      expect(result).toBe(false);
    });

    it('should return false for empty query result', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.isAllowBet();

      expect(result).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // generateMockRandomBillsForAdmin
  // -------------------------------------------------------------------------

  describe('generateMockRandomBillsForAdmin', () => {
    const ADMIN_ID = 9;

    it('should throw when no active ticket exists', async () => {
      mockPrisma.lottoTicket.findFirst.mockResolvedValue(null);

      await expect(service.generateMockRandomBillsForAdmin(ADMIN_ID)).rejects.toThrow(
        new BadRequestException('No active ticket found'),
      );
    });

    it('should generate bills with valid ranges and persist bill total', async () => {
      mockPrisma.lottoTicket.findFirst.mockResolvedValue({ id: 22 });

      let nextBillId = 1000;
      mockPrisma.bill.create.mockImplementation(async () => ({ id: nextBillId++ }));
      mockBet.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.bill.update.mockResolvedValue({});

      const result = await service.generateMockRandomBillsForAdmin(ADMIN_ID);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.length).toBeLessThanOrEqual(100);

      // const allowedAmounts = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400, 500];
      const allowedAmounts = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

      for (const bill of result) {
        expect(bill.user_id).toBe(ADMIN_ID);
        expect(bill.lotto_ticket_id).toBe(22);
        expect(Array.isArray(bill.rows)).toBe(true);
        expect(bill.rows.length).toBeGreaterThanOrEqual(2);
        expect(bill.rows.length).toBeLessThanOrEqual(5);

        for (const row of bill.rows) {
          expect(row.bill_id).toBe(bill.bill_id);
          expect(typeof row.number).toBe('string');
          expect(allowedAmounts).toContain(row.amount);
        }
      }

      expect(mockPrisma.bill.create).toHaveBeenCalledTimes(result.length);
      expect(mockPrisma.bill.update).toHaveBeenCalledTimes(result.length);
      expect(mockBet.createMany).toHaveBeenCalled();
    });
  });
});
