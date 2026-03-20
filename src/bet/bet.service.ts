import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BetType, CreateBetsModalDto } from './dto/create-bets-modal.dto';

type MockBetType =
  | 'top'
  | 'bottom'
  | 'top_bottom'
  | 'three_top'
  | 'tod'
  | 'three_top_tod'
  | 'run_top'
  | 'run_bottom'
  | 'run_top_bottom';

type GeneratedBillRow = {
  bill_id: number;
  lottery_type: BetType;
  number: string;
  bet_type: MockBetType;
  amount: number;
};

type GeneratedBill = {
  bill_id: number;
  user_id: number;
  lotto_ticket_id: number;
  total_amount: number;
  rows: GeneratedBillRow[];
};

@Injectable()
export class BetService {
  constructor(private prisma: PrismaService) { }

  private isTicketOpenNow(ticket: { status: number; startDate: Date | null; endDate: Date | null }): boolean {
    const now = new Date();
    if (ticket.status !== 1) return false;
    if (!ticket.startDate || !ticket.endDate) return false;
    return ticket.startDate <= now && ticket.endDate >= now;
  }

  private ticketOpenErrorReason(ticket: { status: number; startDate: Date | null; endDate: Date | null } | null): string {
    if (!ticket) return 'ไม่พบงวดหวย';
    if (ticket.status !== 1) return 'งวดยังไม่เปิดรับแทง';
    if (!ticket.startDate || !ticket.endDate) return 'งวดยังไม่ได้กำหนดวันที่เริ่มหรือวันที่สิ้นสุด';
    const now = new Date();
    if (now < ticket.startDate) return 'ยังไม่ถึงเวลาที่จะเปิดรับแทง';
    if (now > ticket.endDate) return 'งวดปิดรับแทงแล้ว';
    return '';
  }

  private async assertBillTicketIsOpenNow(billId: bigint): Promise<void> {
    const bill = await this.prisma.bill.findFirst({
      where: { id: Number(billId), deletedAt: null },
      select: { id: true, ticketId: true },
    });

    if (!bill) {
      throw new BadRequestException('ไม่พบบิล');
    }

    const ticket = await this.prisma.lottoTicket.findFirst({
      where: { id: bill.ticketId },
      select: { id: true, status: true, startDate: true, endDate: true },
    });

    const reason = this.ticketOpenErrorReason(ticket ?? null);
    if (reason) {
      throw new BadRequestException(reason);
    }
  }

  private get bet() {
    return (this.prisma as any).bet;
  }

  private serializeBigInt(value: any): any {
    return JSON.parse(
      JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
    );
  }

  private resolveCategoryId(betType: BetType, position: 'top' | 'bottom'): number {
    if (betType === BetType.TWO_DIGIT) return position === 'top' ? 1 : 2;
    if (betType === BetType.THREE_DIGIT) return position === 'top' ? 3 : 5;
    return position === 'top' ? 6 : 7;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private generateRandom2Digit(): string {
    return this.randomInt(0, 99).toString().padStart(2, '0');
  }

  private generateRandom3Digit(): string {
    return this.randomInt(0, 999).toString().padStart(3, '0');
  }

  private generateRunningNumber(): string {
    return this.randomInt(0, 9).toString();
  }

  private generateRandomAmount(): number {
    const tens = Array.from({ length: 9 }, (_, index) => (index + 1) * 10); // 10..90
    const hundreds = Array.from({ length: 5 }, (_, index) => (index + 1) * 100); // 100..500
    const allowedAmounts = [...tens, ...hundreds];
    return allowedAmounts[this.randomInt(0, allowedAmounts.length - 1)];
  }

  private generateBetType(lotteryType: BetType): MockBetType {
    if (lotteryType === BetType.TWO_DIGIT) {
      const options: MockBetType[] = ['top', 'bottom', 'top_bottom'];
      return options[this.randomInt(0, options.length - 1)];
    }
    if (lotteryType === BetType.THREE_DIGIT) {
      const options: MockBetType[] = ['three_top', 'tod', 'three_top_tod'];
      return options[this.randomInt(0, options.length - 1)];
    }
    const options: MockBetType[] = ['run_top', 'run_bottom', 'run_top_bottom'];
    return options[this.randomInt(0, options.length - 1)];
  }

  private generateLotteryType(): BetType {
    const lotteryTypes: BetType[] = [BetType.TWO_DIGIT, BetType.THREE_DIGIT, BetType.RUNNING];
    return lotteryTypes[this.randomInt(0, lotteryTypes.length - 1)];
  }

  private resolvePositionsByMockBetType(betType: MockBetType): Array<'top' | 'bottom'> {
    if (betType === 'top' || betType === 'three_top' || betType === 'run_top') return ['top'];
    if (betType === 'bottom' || betType === 'tod' || betType === 'run_bottom') return ['bottom'];
    return ['top', 'bottom'];
  }

  private generateBillRows(billId: number, rowCount: number): GeneratedBillRow[] {
    const rows: GeneratedBillRow[] = [];

    for (let i = 0; i < rowCount; i += 1) {
      const lotteryType = this.generateLotteryType();
      const amount = this.generateRandomAmount();
      const betType = this.generateBetType(lotteryType);

      let number = '';
      if (lotteryType === BetType.TWO_DIGIT) number = this.generateRandom2Digit();
      if (lotteryType === BetType.THREE_DIGIT) number = this.generateRandom3Digit();
      if (lotteryType === BetType.RUNNING) number = this.generateRunningNumber();

      rows.push({
        bill_id: billId,
        lottery_type: lotteryType,
        number,
        bet_type: betType,
        amount,
      });
    }

    return rows;
  }

  private calculateBillTotal(rows: GeneratedBillRow[]): number {
    return rows.reduce((sum, row) => {
      const positionCount = this.resolvePositionsByMockBetType(row.bet_type).length;
      return sum + row.amount * positionCount;
    }, 0);
  }

  async generateMockRandomBillsForAdmin(adminId: number): Promise<GeneratedBill[]> {
    const latestTicket = await this.prisma.lottoTicket.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true, status: true, startDate: true, endDate: true },
    });

    const reason = this.ticketOpenErrorReason(latestTicket ?? null);
    if (reason) {
      throw new BadRequestException(reason);
    }

    const activeTicket = { id: latestTicket!.id };

    const generatedBills: GeneratedBill[] = [];
    const billCount = this.randomInt(2, 100);

    for (let i = 0; i < billCount; i += 1) {
      const createdBill = await this.prisma.bill.create({
        data: {
          adminId,
          ticketId: activeTicket.id,
          totalAmount: 0,
          totalWinner: 0,
        },
        select: { id: true },
      });

      const rowCount = this.randomInt(2, 5);
      const rows = this.generateBillRows(createdBill.id, rowCount);
      const betCreateData: Array<{
        billId: bigint;
        adminId: number;
        rowNumber: number;
        lottoCategoryId: number;
        code: string;
        amount: number;
      }> = [];

      rows.forEach((row, rowIndex) => {
        const positions = this.resolvePositionsByMockBetType(row.bet_type);
        positions.forEach((position) => {
          betCreateData.push({
            billId: BigInt(createdBill.id),
            adminId,
            rowNumber: rowIndex + 1,
            lottoCategoryId: this.resolveCategoryId(row.lottery_type, position),
            code: row.number,
            amount: row.amount,
          });
        });
      });

      if (betCreateData.length > 0) {
        await this.bet.createMany({ data: betCreateData });
      }

      const totalAmount = this.calculateBillTotal(rows);
      await this.prisma.bill.update({
        where: { id: createdBill.id },
        data: { totalAmount },
      });

      generatedBills.push({
        bill_id: createdBill.id,
        user_id: adminId,
        lotto_ticket_id: activeTicket.id,
        total_amount: totalAmount,
        rows,
      });
    }

    return this.serializeBigInt(generatedBills);
  }

  async createFromModal(adminId: number, payload: CreateBetsModalDto) {
    const latestTicket = await this.prisma.lottoTicket.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true, status: true, startDate: true, endDate: true },
    });

    const reason = this.ticketOpenErrorReason(latestTicket ?? null);
    if (reason) {
      throw new BadRequestException(reason);
    }

    const activeTicket = { id: latestTicket!.id };

    // Normalize rows
    const normalizedRows: Array<{ input1: string; input2?: number; input3?: number; betType: BetType }> = [];

    for (let idx = 0; idx < payload.rows.length; idx += 1) {
      const row = payload.rows[idx];
      const input1 = (row.input1 || '').trim();
      const input2 = row.input2; // amount for top
      const input3 = row.input3; // amount for bottom

      if (!input1) throw new BadRequestException(`Row ${idx + 1}: หมายเลข (input1) ต้องระบุ`);
      if ((input2 === undefined || input2 === null) && (input3 === undefined || input3 === null)) {
        throw new BadRequestException(`Row ${idx + 1}: ต้องระบุจำนวนบนหรือจำนวนล่างอย่างน้อย 1 ช่อง`);
      }

      if (!/^\d{1,3}$/.test(input1)) throw new BadRequestException(`Row ${idx + 1}: หมายเลขต้องเป็นตัวเลข 1-3 หลักเท่านั้น`);
      if (input2 !== undefined && (!Number.isFinite(input2) || !Number.isInteger(input2) || input2 <= 0)) {
        throw new BadRequestException(`Row ${idx + 1}: จำนวนบนต้องเป็นจำนวนเต็มบวก`);
      }
      if (input3 !== undefined && (!Number.isFinite(input3) || !Number.isInteger(input3) || input3 <= 0)) {
        throw new BadRequestException(`Row ${idx + 1}: จำนวนล่างต้องเป็นจำนวนเต็มบวก`);
      }

      normalizedRows.push({ input1, input2, input3, betType: row.betType });
    }

    // compute total amount directly from submitted amounts.
    const totalAmount = normalizedRows.reduce((sum, row) => {
      const top = row.input2 ? Number(row.input2) : 0;
      const bottom = row.input3 ? Number(row.input3) : 0;
      return sum + top + bottom;
    }, 0);

    const bill = await this.prisma.bill.create({
      data: {
        adminId,
        ticketId: activeTicket.id,
        totalAmount: 0,
        totalWinner: 0,
      },
      select: { id: true, ticketId: true, adminId: true },
    });

    // Start row numbering from 1 for each newly created bill.
    let nextRowNumber = 1;
    const createData: Array<{
      billId: bigint;
      adminId: number;
      rowNumber: number;
      lottoCategoryId: number;
      code: string;
      amount: number;
    }> = [];

    for (const row of normalizedRows) {
      const code = row.input1;
      if (row.input2 !== undefined && row.input2 !== null && row.input2 > 0) {
        createData.push({
          billId: BigInt(bill.id),
          adminId,
          rowNumber: nextRowNumber,
          lottoCategoryId: this.resolveCategoryId(row.betType, 'top'),
          code,
          amount: Number(row.input2),
        });
      }
      if (row.input3 !== undefined && row.input3 !== null && row.input3 > 0) {
        createData.push({
          billId: BigInt(bill.id),
          adminId,
          rowNumber: nextRowNumber,
          lottoCategoryId: this.resolveCategoryId(row.betType, 'bottom'),
          code,
          amount: Number(row.input3),
        });
      }
      nextRowNumber += 1;
    }

    if (createData.length) {
      await this.bet.createMany({ data: createData });
    }

    await this.prisma.bill.update({
      where: { id: bill.id },
      data: { totalAmount },
    });

    const billCount = await this.prisma.bill.count({
      where: { adminId, ticketId: activeTicket.id, deletedAt: null },
    });

    return this.serializeBigInt({
      success: true,
      billId: bill.id,
      billNumber: billCount,
      ticketId: activeTicket.id,
      createdBetRows: normalizedRows.length,
      createdBetItems: createData.length,
      totalAmount,
    });
  }

  async findAll(adminId?: number, roleId?: number) {
    const where: any = { deletedAt: null };
    if (roleId !== undefined && roleId !== 1) {
      where.adminId = adminId;
    }
    const rows = await this.bet.findMany({ where });
    return this.serializeBigInt(rows);
  }

  async findAllPaginated(
    page: number,
    limit: number,
    search?: string,
    orderBy?: string[],
    order?: ('asc' | 'desc')[],
    adminId?: number,
    roleId?: number,
    filters?: {
      ticketId?: number;
      adminIdFilter?: number;
      code?: string;
      billId?: number;
      lottoCategoryId?: number;
      isWinner?: boolean;
    },
  ) {
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };
    const sortColumnMap: Record<string, string> = {
      id: 'id',
      billId: 'billId',
      adminId: 'adminId',
      rowNumber: 'rowNumber',
      lottoCategoryId: 'lottoCategoryId',
      code: 'code',
      amount: 'amount',
      winnerAmount: 'winnerAmount',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      // aliases coming from UI / legacy payload keys
      ticketId: 'billId',
      ticketTitle: 'billId',
      bill_id: 'billId',
      rowId: 'rowNumber',
      row_id: 'rowNumber',
      categoryName: 'lottoCategoryId',
      adminName: 'adminId',
    };

    const normalizedSorts = Array.isArray(orderBy)
      ? orderBy
        .map((col, idx) => {
          const mappedCol = sortColumnMap[col];
          if (!mappedCol) return null;
          const dir = Array.isArray(order) && order[idx] === 'asc' ? 'asc' : 'desc';
          return { [mappedCol]: dir };
        })
        .filter(Boolean)
      : [];

    const orderObj = normalizedSorts.length > 0 ? normalizedSorts : [{ createdAt: 'desc' }];

    if (roleId !== undefined && roleId !== 1) {
      where.adminId = adminId;
    }
    if (search) {
      const trimmedSearch = search.trim();
      const searchOr: any[] = [{ code: { contains: trimmedSearch } }];
      const numericSearch = Number(trimmedSearch);

      if (Number.isFinite(numericSearch)) {
        searchOr.push({ amount: { equals: numericSearch } });
      }

      where.OR = searchOr;
    }

    // Advanced filters
    if (filters?.ticketId) {
      // Filter by bills belonging to this ticket
      const billIds = await this.prisma.bill.findMany({
        where: { ticketId: filters.ticketId, deletedAt: null },
        select: { id: true },
      });
      where.billId = { in: billIds.map((b) => BigInt(b.id)) };
    }
    if (filters?.adminIdFilter !== undefined) {
      where.adminId = filters.adminIdFilter;
    }
    if (filters?.code !== undefined) {
      where.code = { contains: filters.code.trim() };
    }
    if (filters?.billId !== undefined) {
      where.billId = BigInt(filters.billId);
    }
    if (filters?.lottoCategoryId !== undefined) {
      where.lottoCategoryId = filters.lottoCategoryId;
    }

    if (filters?.isWinner !== undefined) {
      where.winnerAmount = filters.isWinner ? { gt: 0 } : 0;
    }

    const [data, total] = await Promise.all([
      this.bet.findMany({
        where,
        skip,
        take: limit,
        orderBy: orderObj,
        select: {
          id: true,
          adminId: true,
          billId: true,
          rowNumber: true,
          lottoCategoryId: true,
          code: true,
          amount: true,
          isLimitNumber: true,
          winnerAmount: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.bet.count({ where }),
    ]);

    const adminIds = [...new Set(data.map((d: any) => d.adminId))];
    const categoryIds = [...new Set(data.map((d: any) => d.lottoCategoryId))];

    const [admins, categories] = await Promise.all([
      adminIds.length
        ? this.prisma.admin.findMany({ where: { id: { in: adminIds as number[] } }, select: { id: true, name: true } })
        : [],
      categoryIds.length
        ? this.prisma.lottoCategory.findMany({ where: { id: { in: categoryIds as number[] } }, select: { id: true, name: true } })
        : [],
    ]);

    const adminMap = Object.fromEntries(admins.map((a: any) => [a.id, a.name]));
    const categoryMap = Object.fromEntries(categories.map((c: any) => [c.id, c.name]));

    // Resolve bill -> ticket -> title mapping
    const billIds = Array.from(new Set(data.map((d: any) => Number(d.billId)))) as number[];
    const bills = billIds.length
      ? await this.prisma.bill.findMany({ where: { id: { in: billIds as number[] } }, select: { id: true, ticketId: true } })
      : [];
    const billMap: Record<number, number> = Object.fromEntries(bills.map((b: any) => [b.id, b.ticketId]));
    const ticketIds = Array.from(new Set(bills.map((b: any) => b.ticketId))) as number[];
    const tickets = ticketIds.length
      ? await this.prisma.lottoTicket.findMany({
        where: { id: { in: ticketIds as number[] } },
        select: { id: true, title: true, startDate: true, endDate: true, status: true },
      })
      : [];
    const ticketMap: Record<number, { title: string; startDate: Date | null; endDate: Date | null; status: number }> =
      Object.fromEntries(
        tickets.map((t: any) => [
          t.id,
          {
            title: t.title,
            startDate: t.startDate ?? null,
            endDate: t.endDate ?? null,
            status: t.status,
          },
        ]),
      );

    const enriched = data.map((row: any) => {
      const billIdNum = Number(row.billId);
      const ticketId = billMap[billIdNum];
      const ticket = ticketId ? ticketMap[ticketId] : null;
      return {
        ...row,
        adminName: adminMap[row.adminId] ?? null,
        categoryName: categoryMap[row.lottoCategoryId] ?? null,
        ticketTitle: ticket?.title ?? null,
        ticketStartDate: ticket?.startDate ?? null,
        ticketEndDate: ticket?.endDate ?? null,
        ticketStatus: ticket?.status ?? null,
      };
    });

    return {
      data: this.serializeBigInt(enriched),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: bigint) {
    const row = await this.bet.findFirst({ where: { id, deletedAt: null } });
    return this.serializeBigInt(row);
  }

  async findOneWithRelations(id: bigint) {
  
    const result = await this.prisma.$queryRaw<
      Array<{
        id: bigint;
        adminId: number;
        billId: bigint;
        rowNumber: number;
        lottoCategoryId: number;
        code: string;
        amount: number;
        createdAt: Date;
        updatedAt: Date;
        adminName: string | null;
        categoryName: string | null;
        ticketTitle: string | null;
        ticketStartDate: Date | null;
        ticketEndDate: Date | null;
        ticketStatus: number | null;
      }>
    >`SELECT
      b.id AS "id",
      b.admin_id AS "adminId",
      b.bill_id AS "billId",
      b.row_number AS "rowNumber",
      b.lotto_category_id AS "lottoCategoryId",
      b.code AS "code",
      b.amount AS "amount",
      b.created_at AS "createdAt",
      b.updated_at AS "updatedAt",
      a.name AS "adminName",
      c.name AS "categoryName",
      t.title AS "ticketTitle",
      t.start_date AS "ticketStartDate",
      t.end_date AS "ticketEndDate",
      t.status AS "ticketStatus"
      FROM bets b
      LEFT JOIN admins a ON b.admin_id = a.id
      LEFT JOIN lotto_categories c ON b.lotto_category_id = c.id
      LEFT JOIN bills bl ON b.bill_id = bl.id
      LEFT JOIN lotto_tickets t ON bl.ticket_id = t.id
      WHERE b.id = ${id} AND b.deleted_at IS NULL
      LIMIT 1`;

    return this.serializeBigInt(result[0] ?? null);
  }


  async create(data: any) {
    const billId = BigInt(data.billId);
    await this.assertBillTicketIsOpenNow(billId);

    const created = await this.bet.create({
      data: {
        billId,
        adminId: data.adminId,
        rowNumber: data.rowNumber,
        lottoCategoryId: data.lottoCategoryId,
        code: String(data.code),
        amount: data.amount,
      },
    });
    return this.serializeBigInt(created);
  }

  async update(id: bigint, data: any) {
    const existing = await this.bet.findFirst({
      where: { id, deletedAt: null },
      select: { billId: true },
    });

    if (!existing) {
      throw new BadRequestException('Bet not found');
    }

    const updateData: any = { ...data };
    const targetBillId = updateData.billId !== undefined ? BigInt(updateData.billId) : existing.billId;
    await this.assertBillTicketIsOpenNow(targetBillId);

    if (updateData.billId !== undefined) {
      updateData.billId = targetBillId;
    }

    const updated = await this.bet.update({ where: { id }, data: updateData });

    // update totalAmount in impacted bills
    if (updateData.billId !== undefined && existing.billId !== updateData.billId) {
      await this.updateTotalAmountBill(existing.billId);
    }
    await this.updateTotalAmountBill(targetBillId);

    return this.serializeBigInt(updated);
  }

  async delete(id: bigint, billId?: number) {
    const where: any = { id, deletedAt: null };
    if (billId !== undefined) {
      where.billId = BigInt(billId);
    }

    const targetBet = await this.bet.findFirst({
      where,
      select: { billId: true },
    });

    if (!targetBet) {
      return this.serializeBigInt({ count: 0 });
    }

    await this.assertBillTicketIsOpenNow(targetBet.billId);

    const result = await this.bet.updateMany({ where, data: { deletedAt: new Date() } });

    // update totalAmount in bill
    await this.updateTotalAmountBill(targetBet.billId);

    return this.serializeBigInt(result);
  }

  async findAllWithDeleted() {
    const rows = await this.prisma.withDeleted('bet').findMany();
    return this.serializeBigInt(rows);
  }

  async findOnlyDeleted() {
    const rows = await this.prisma.onlyDeleted('bet').findMany();
    return this.serializeBigInt(rows);
  }

  async findDeletedById(id: bigint) {
    const row = await this.prisma.onlyDeleted('bet').findFirst({ where: { id } });
    return this.serializeBigInt(row);
  }

  async countDeleted() {
    return this.prisma.onlyDeleted('bet').count();
  }

  async restore(id: bigint) {
    const row = await this.prisma.restore('bet', id);
    return this.serializeBigInt(row);
  }

  async forceDelete(id: bigint) {
    return this.prisma.forceDelete('bet', id);
  }

  async forceDeleteOldRecords() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this.prisma.forceDeleteMany('bet', { deletedAt: { lte: thirtyDaysAgo } });
  }

  async isAllowBet() {
    const now = new Date();
    const result = await this.prisma.$queryRaw<
      Array<{ allow: boolean }>
    >`SELECT CASE WHEN COUNT(*) > 0 THEN true ELSE false END AS allow FROM lotto_tickets WHERE status = 1 AND start_date <= ${now} AND end_date >= ${now} AND deleted_at IS NULL`;
    return result[0]?.allow ?? false;
  }

  async updateTotalAmountBill(billId: bigint) {
    const totalAmount = await this.bet.aggregate({
      where: { billId, deletedAt: null },
      _sum: { amount: true },
    });
    await this.prisma.bill.update({
      where: { id: Number(billId) },
      data: { totalAmount: totalAmount._sum.amount ?? 0 },
    });
  }
}
