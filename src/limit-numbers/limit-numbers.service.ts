import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class LimitNumbersService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll() {
    return this.prisma.limitNumber.findMany({ where: { deletedAt: null }, orderBy: { id: 'desc' } });
  }

  async findAllPaginated(page: number, limit: number, lotto_ticket_id?: string, code?: string, orderBy?: string, order?: 'asc' | 'desc') {
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (lotto_ticket_id) {
      const num = Number(lotto_ticket_id);
      if (!Number.isNaN(num)) {
        where.lottoTicketId = { equals: num };
      }
    }

    if (code) {
      where.code = { contains: code, mode: 'insensitive' as any };
    }

    const orderObj = orderBy ? ({ [orderBy]: order || 'desc' } as any) : { id: 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.limitNumber.findMany({ where, skip, take: limit, orderBy: orderObj, select: { id: true, lottoTicketId: true, code: true, createdAt: true } }),
      this.prisma.limitNumber.count({ where }),
    ]);

    // this.prisma.$on('query', (e) => {
    //   console.log('Query: ' + e.query);
    //   console.log('Params: ' + e.params);
    //   console.log('Duration: ' + e.duration + 'ms');
    // });

    // fetch related tickets separately to avoid requiring a Prisma relation in schema
    const ticketIds = Array.from(new Set(data.map((d: any) => d.lottoTicketId).filter(Boolean)));
    const tickets = ticketIds.length
      ? await this.prisma.lottoTicket.findMany({ where: { id: { in: ticketIds } }, select: { id: true, status: true, title: true } })
      : [];

    const ticketMap: Record<number, any> = {};
    tickets.forEach((t: any) => {
      ticketMap[t.id] = t;
    });

    // normalize to include ticketStatus and ticketTitle
    const normalized = data.map((d: any) => ({
      id: d.id,
      lottoTicketId: d.lottoTicketId,
      code: d.code,
      createdAt: d.createdAt,
      ticketStatus: ticketMap[d.lottoTicketId]?.status ?? null,
      ticketTitle: ticketMap[d.lottoTicketId]?.title ?? null,
    }));


    return {
      data: normalized,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(data: { lottoTicketId: number; code: string }) {
    return this.prisma.limitNumber.create({ data: { lottoTicketId: data.lottoTicketId, code: data.code } });
  }

  async createMany(items: { lottoTicketId: number; code: string }[]) {
    if (!items || items.length === 0) return { count: 0 };

    // normalize and remove empty codes
    const data = items
      .map((it) => ({ lottoTicketId: Number(it.lottoTicketId), code: String(it.code).trim() }))
      .filter((it) => it.code !== "");

    if (data.length === 0) return { count: 0 };

    // Use createMany for bulk insert. skipDuplicates avoids unique constraint errors if any.
    const result = await this.prisma.limitNumber.createMany({ data, skipDuplicates: true });
    return { count: (result.count as number) || 0 };
  }

  async deleteByCodes(lottoTicketId: number, codes: string[]) {
    if (!codes || codes.length === 0) return { count: 0 };

    const cleaned = codes.map((c) => String(c).trim()).filter((c) => c !== "");
    if (cleaned.length === 0) return { count: 0 };

    const result = await this.prisma.limitNumber.updateMany({
      where: { lottoTicketId: Number(lottoTicketId), code: { in: cleaned }, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    return { count: (result.count as number) || 0 };
  }

  async delete(id: number) {
    return this.prisma.limitNumber.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  /**
   * Returns a Set of all limit codes for a ticket, expanded to include every
   * contiguous substring so that any category can check against them.
   * e.g. ['123', '45'] → Set { '123', '12', '23', '1', '2', '3', '45', '4', '5' }
   */
  async getLimitCodesForTicket(ticketId: number): Promise<Set<string>> {
    const limitNumbers = await this.prisma.limitNumber.findMany({
      where: { lottoTicketId: ticketId, deletedAt: null },
      select: { code: true },
    });

    const limitCodes = new Set(limitNumbers.map((ln) => ln.code));

    for (const { code } of limitNumbers) {
      for (let i = 0; i < code.length; i++) {
        for (let j = i + 1; j <= code.length; j++) {
          limitCodes.add(code.slice(i, j));
        }
      }
    }

    return limitCodes;
  }

  async checkIsLimitNumber(input: string, blockedList: string[], lottoCategoryId: number): Promise<boolean> {
    const inputLength = input.length;

    if (inputLength === 1) {
      // หาเลขอั้น 1 หลักเท่านั้น
      const singleBlocked = blockedList.filter((b) => b.length === 1);
      return singleBlocked.includes(input);
    }

    if (inputLength === 2) {
      // หาเลขอั้น 2 หลักเท่านั้น
      const doubleBlocked = blockedList.filter((b) => b.length === 2);
      return doubleBlocked.includes(input);
    }

    if (inputLength === 3) {

      const doubleBlocked = blockedList.filter((b) => b.length === 2);

      // 3 ตัวโต๊ด: เช็คทุก permutation ของ input กับ blockedList 2 หลัก
      if (lottoCategoryId === 5) {
        // สลับ ตัวเลข 3 ตัวโดยที่ต้องไม่ซ้ำกันเพื่อเช็คกับเลขอั้น 2 ตัว
        const permutations = new Set<string>();
        for (let i = 0; i < inputLength; i++) {
          for (let j = 0; j < inputLength; j++) {
            if (j === i) continue;
            for (let k = 0; k < inputLength; k++) {
              if (k === i || k === j) continue;
              permutations.add(input[i] + input[j] + input[k]);
            }
          }
        }

        for (const perm of permutations) {
          const lastTwo = perm.slice(-2);
          if (doubleBlocked.includes(lastTwo)) {
            return true;
          }
        }

        return false;
      }
       
      // 3 ตัวตรง/โต้ด: เช็ค 2 ตัวสุดท้าย
      const lastTwo = input.slice(-2);
      return doubleBlocked.includes(lastTwo);
    }

    return false;
  }
}
