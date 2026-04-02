import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';
import { LimitNumbersService } from '../limit-numbers/limit-numbers.service';

@Injectable()
export class SummaryService {
  constructor(private prisma: PrismaService, private limitNumbersService: LimitNumbersService,) { }

  async getBillsSummarySuperAdmin(adminId?: number, roleId?: number, ticketId?: number, topN = 10, overBet = 500) {
    const billWhere: any = { deletedAt: null };
    const rawLimitCodesByTicket = new Map<number, string[]>();

    if (ticketId !== undefined) {
      rawLimitCodesByTicket.set(ticketId, await this.limitNumbersService.getRawLimitCodesForTicket(ticketId));
    }

    if (roleId !== undefined && roleId !== 1) {
      billWhere.adminId = adminId;
    }
    if (ticketId !== undefined) {
      billWhere.ticketId = ticketId;
    }

    const ticketTotals = await this.prisma.bill.groupBy({
      by: ['ticketId'],
      where: billWhere,
      _sum: {
        totalAmount: true,
        totalWinner: true,
      },
      orderBy: {
        ticketId: 'desc',
      },
    });

    if (ticketTotals.length === 0) {
      return { data: [] };
    }

    const ticketIds = ticketTotals.map((row) => row.ticketId);
    const tickets = await this.prisma.lottoTicket.findMany({
      where: { id: { in: ticketIds } },
      select: { id: true, title: true },
    });
    const ticketMap = Object.fromEntries(tickets.map((ticket) => [ticket.id, ticket.title]));

    const conditions: Prisma.Sql[] = [
      Prisma.sql`bt.deleted_at IS NULL`,
      Prisma.sql`bl.deleted_at IS NULL`,
      Prisma.sql`bl.ticket_id IN (${Prisma.join(ticketIds)})`,
    ];

    if (roleId !== undefined && roleId !== 1 && adminId !== undefined) {
      conditions.push(Prisma.sql`bl.admin_id = ${adminId}`);
    }

    const groupedCodes = await this.prisma.$queryRaw<
      Array<{
        ticketId: number;
        lottoCategoryId: number;
        code: string;
        amount: Prisma.Decimal;
      }>
    >`
      WITH grouped AS (
        SELECT
          bl.ticket_id AS "ticketId",
          bt.lotto_category_id AS "lottoCategoryId",
          bt.code AS "code",
          SUM(bt.amount) AS "amount"
        FROM bets bt
        INNER JOIN bills bl ON bt.bill_id = bl.id
        WHERE ${Prisma.join(conditions, ' AND ')}
        GROUP BY bl.ticket_id, bt.lotto_category_id, bt.code
        HAVING SUM(bt.amount) >= ${overBet}
      ),
      ranked AS (
        SELECT
          "ticketId",
          "lottoCategoryId",
          "code",
          "amount",
          ROW_NUMBER() OVER (
            PARTITION BY "ticketId", "lottoCategoryId"
            ORDER BY "amount" DESC, "code" ASC
          ) AS row_num
        FROM grouped
      )
      SELECT
        "ticketId",
        "lottoCategoryId",
        "code",
        "amount"
      FROM ranked
      WHERE row_num <= ${topN}
      ORDER BY "ticketId" DESC, "lottoCategoryId" ASC, "amount" DESC, "code" ASC
    `;

    const categoryIds = [...new Set(groupedCodes.map((row) => row.lottoCategoryId))];
    const categories = categoryIds.length
      ? await this.prisma.lottoCategory.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true },
      })
      : [];
    const categoryMap = Object.fromEntries(categories.map((category) => [category.id, category.name]));

    const summaryByTicket = new Map<
      number,
      {
        ticketId: number;
        ticketTitle: string | null;
        totalAmount: number;
        totalWinner: number;
        lottoCategories: Array<{
          lottoCategoryId: number;
          lottoCategoryName: string | null;
          codes: Array<{ code: string; amount: number; isLimit: boolean }>;
        }>;
      }
    >();

    for (const total of ticketTotals) {
      summaryByTicket.set(total.ticketId, {
        ticketId: total.ticketId,
        ticketTitle: ticketMap[total.ticketId] ?? null,
        totalAmount: Number(total._sum.totalAmount ?? 0),
        totalWinner: Number(total._sum.totalWinner ?? 0),
        lottoCategories: [],
      });
    }

    for (const row of groupedCodes) {
      const ticketSummary = summaryByTicket.get(row.ticketId);
      if (!ticketSummary) continue;

      let blockedList = rawLimitCodesByTicket.get(row.ticketId);
      if (!blockedList) {
        blockedList = await this.limitNumbersService.getRawLimitCodesForTicket(row.ticketId);
        rawLimitCodesByTicket.set(row.ticketId, blockedList);
      }

      const isLimit = blockedList.length > 0
        ? await this.limitNumbersService.checkIsLimitNumber(row.code, blockedList, row.lottoCategoryId)
        : false;

      let categorySummary = ticketSummary.lottoCategories.find((item) => item.lottoCategoryId === row.lottoCategoryId);
      if (!categorySummary) {
        categorySummary = {
          lottoCategoryId: row.lottoCategoryId,
          lottoCategoryName: categoryMap[row.lottoCategoryId] ?? null,
          codes: [],
        };
        ticketSummary.lottoCategories.push(categorySummary);
      }

      categorySummary.codes.push({
        code: row.code,
        amount: Number(row.amount),
        isLimit,
      });
    }

    return { data: Array.from(summaryByTicket.values()) };
  }

  async getBillsSummaryUser(adminId?: number, ticketId?: number) {
    // summary  totalAmount and totalWinner for each ticket that this admin has bets on
    const billWhere: any = { deletedAt: null, adminId };
    if (ticketId !== undefined) {
      billWhere.ticketId = ticketId;
    }

    const ticketTotals = await this.prisma.bill.groupBy({
      by: ['ticketId'],
      where: billWhere,
      _sum: {
        totalAmount: true,
        totalWinner: true,
      },
      orderBy: {
        ticketId: 'desc',
      },
    });

    if (ticketTotals.length === 0) {  
      return { data: [] };
    }

    const ticketIds = ticketTotals.map((row) => row.ticketId);
    const tickets = await this.prisma.lottoTicket.findMany({
      where: { id: { in: ticketIds } },
      select: { id: true, title: true },
    });
    const ticketMap = Object.fromEntries(tickets.map((ticket) => [ticket.id, ticket.title]));

    const summary = ticketTotals.map((total) => ({
      ticketId: total.ticketId,
      ticketTitle: ticketMap[total.ticketId] ?? null,
      totalAmount: Number(total._sum.totalAmount ?? 0),
      totalWinner: Number(total._sum.totalWinner ?? 0),
      lottoCategories:[]
    }));

     return { data: summary };

  }
}
