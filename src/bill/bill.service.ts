import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';
import { SummaryService } from '../summary/summary-service';

@Injectable()
export class BillService {
  constructor(private prisma: PrismaService, private summaryService: SummaryService) {}

  private get bill() {
    return (this.prisma as any).bill;
  }

  private serializeBigInt(value: any): any {
    return JSON.parse(
      JSON.stringify(value, (_, currentValue) =>
        typeof currentValue === 'bigint' ? currentValue.toString() : currentValue,
      ),
    );
  }

  async findAll(adminId?: number, roleId?: number) {
    const where: any = { deletedAt: null };
    if (roleId !== undefined && roleId !== 1) {
      where.adminId = adminId;
    }
    const rows = await this.bill.findMany({ where });
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
      billId?: number;
      isWinner?: boolean;
    },
  ) {
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };
    const sortColumnMap: Record<string, string> = {
      id: 'id',
      billId: 'id',
      adminId: 'adminId',
      adminName: 'adminId',
      ticketId: 'ticketId',
      ticketTitle: 'ticketId',
      totalAmount: 'totalAmount',
      totalWinner: 'totalWinner',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      bill_id: 'id',
      ticket_id: 'ticketId',
    };

    const normalizedSorts = Array.isArray(orderBy)
      ? orderBy
          .map((key, index) => {
            const mappedKey = sortColumnMap[key];
            if (!mappedKey) return null;
            const direction = Array.isArray(order) && order[index] === 'asc' ? 'asc' : 'desc';
            return { [mappedKey]: direction };
          })
          .filter(Boolean)
      : [];

    const orderObj = normalizedSorts.length > 0 ? normalizedSorts : [{ createdAt: 'desc' }];

    if (roleId !== undefined && roleId !== 1) {
      where.adminId = adminId;
    }

    if (search) {
      const numericSearch = Number(search);
      const orConditions: any[] = [];

      if (Number.isInteger(numericSearch)) {
        orConditions.push({ id: numericSearch });
        orConditions.push({ adminId: numericSearch });
        orConditions.push({ ticketId: numericSearch });
      }

      if (Number.isFinite(numericSearch)) {
        orConditions.push({ totalAmount: numericSearch });
      }

      if (orConditions.length > 0) {
        where.OR = orConditions;
      }
    }

    if (filters?.ticketId !== undefined) {
      where.ticketId = filters.ticketId;
    }
    if (filters?.adminIdFilter !== undefined) {
      where.adminId = filters.adminIdFilter;
    }
    if (filters?.billId !== undefined) {
      where.id = filters.billId;
    }

    if (filters?.isWinner !== undefined) {
      // totalWinner > 0 means at least one winning bet, totalWinner = 0 means no winning bets
      where.totalWinner = filters.isWinner ? { gt: 0 } : 0;
    }

    const [data, total] = await Promise.all([
      this.bill.findMany({
        where,
        skip,
        take: limit,
        orderBy: orderObj,
        select: {
          id: true,
          adminId: true,
          ticketId: true,
          totalAmount: true,
          totalWinner: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.bill.count({ where }),
    ]);

    const adminIds = [...new Set(data.map((row: any) => row.adminId))];
    const ticketIds = [...new Set(data.map((row: any) => row.ticketId))];

    const [admins, tickets] = await Promise.all([
      adminIds.length
        ? this.prisma.admin.findMany({
            where: { id: { in: adminIds as number[] } },
            select: { id: true, name: true },
          })
        : [],
      ticketIds.length
        ? this.prisma.lottoTicket.findMany({
            where: { id: { in: ticketIds as number[] } },
            select: { id: true, title: true, startDate: true, endDate: true, status: true },
          })
        : [],
    ]);

    const adminMap = Object.fromEntries(admins.map((admin: any) => [admin.id, admin.name]));
    const ticketMap: Record<number, { title: string; startDate: Date | null; endDate: Date | null; status: number }> =
      Object.fromEntries(
        tickets.map((ticket: any) => [
          ticket.id,
          {
            title: ticket.title,
            startDate: ticket.startDate ?? null,
            endDate: ticket.endDate ?? null,
            status: ticket.status,
          },
        ]),
      );

    const enriched = data.map((row: any) => ({
      ...row,
      adminName: adminMap[row.adminId] ?? null,
      billId: row.id,
      ticketTitle: ticketMap[row.ticketId]?.title ?? null,
      ticketStartDate: ticketMap[row.ticketId]?.startDate ?? null,
      ticketEndDate: ticketMap[row.ticketId]?.endDate ?? null,
      ticketStatus: ticketMap[row.ticketId]?.status ?? null,
    }));

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

  async findOne(id: number) {
    return this.bill.findFirst({ where: { id, deletedAt: null } });
  }

  async create(data: any) {
    return this.bill.create({
      data: {
        adminId: data.adminId,
        ticketId: data.ticketId,
        totalAmount: data.totalAmount,
      },
    });
  }

  async update(id: number, data: any) {
    const updateData: any = { ...data };
    return this.bill.update({ where: { id }, data: updateData });
  }

  async delete(id: number) {

    // delete related bets first (soft delete)
    
    // await this.prisma.$executeRaw`UPDATE "Bet" SET "deletedAt" = NOW() WHERE "billId" = ${id} AND "deletedAt" IS NULL`;

    await (this.prisma as any).bet.updateMany({
      where: { billId: id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    // then soft delete the bill

    return this.bill.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: new Date() } });
  }

  async findAllWithDeleted() {
    return this.prisma.withDeleted('bill').findMany();
  }

  async findOnlyDeleted() {
    return this.prisma.onlyDeleted('bill').findMany();
  }

  async findDeletedById(id: number) {
    return this.prisma.onlyDeleted('bill').findFirst({ where: { id } });
  }

  async countDeleted() {
    return this.prisma.onlyDeleted('bill').count();
  }

  async restore(id: number) {
    return this.prisma.restore('bill', id);
  }

  async forceDelete(id: number) {
    return this.prisma.forceDelete('bill', id);
  }

  async forceDeleteOldRecords() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this.prisma.forceDeleteMany('bill', { deletedAt: { lte: thirtyDaysAgo } });
  }

  // findOneWithBets(id: number)
  async findOneWithBets(id: number) {
    const bill = await this.bill.findFirst({ where: { id, deletedAt: null } });
    if (!bill) return null;

    const bets = await (this.prisma as any).bet.findMany({
      where: {
        billId: BigInt(id),
        deletedAt: null,
      },
      orderBy: [
        { rowNumber: 'asc' },
        { lottoCategoryId: 'asc' },
        { id: 'asc' },
      ],
      select: {
        id: true,
        billId: true,
        adminId: true,
        rowNumber: true,
        lottoCategoryId: true,
        code: true,
        amount: true,
        isLimitNumber: true,
        winnerAmount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const categoryIds = [...new Set(bets.map((bet: any) => bet.lottoCategoryId))];
    const categories = categoryIds.length
      ? await this.prisma.lottoCategory.findMany({
          where: { id: { in: categoryIds as number[] } },
          select: { id: true, name: true },
        })
      : [];

    const categoryMap = Object.fromEntries(categories.map((category: any) => [category.id, category.name]));
    const betsWithCategory = bets.map((bet: any) => ({
      ...bet,
      categoryName: categoryMap[bet.lottoCategoryId] ?? null,
    }));

    // get admin name and ticket title for the bill
    const [admin, ticket] = await Promise.all([
      this.prisma.admin.findFirst({ where: { id: bill.adminId }, select: { name: true } }),
      this.prisma.lottoTicket.findFirst({ where: { id: bill.ticketId }, select: { title: true, status: true } }),
    ]);

    const enrichedBill = {
      ...bill,
      adminName: admin?.name ?? null,
      ticketTitle: ticket?.title ?? null,
      ticketStatus: ticket?.status ?? 0,
    };

    return this.serializeBigInt({
      ...enrichedBill,
      bets: betsWithCategory,
    });
  }

  async restoreMany(ids: number[]) {
    return this.prisma.restoreMany('bill', ids);
  }
}
