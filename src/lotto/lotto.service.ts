import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LimitNumbersService } from '../limit-numbers/limit-numbers.service';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class LottoService {
  constructor(
    private prisma: PrismaService,
    private limitNumbersService: LimitNumbersService,
  ) { }

  private get lotto() {
    return (this.prisma as any).lottoTicket;
  }

  async findAll() {
    return this.lotto.findMany({ where: { deletedAt: null } });
  }

  async findActiveOptions() {
    return this.lotto.findMany({
      where: { status: { in: [1, 3] }, deletedAt: null },
      orderBy: [{ id: 'desc' }, { status: 'asc' }],
      select: { id: true, title: true, status: true },
    });
  }

  async findAllCategories() {
    return this.prisma.lottoCategory.findMany({
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    });
  }

  async findAllPaginated(page: number, limit: number, search?: string, orderBy?: string, order?: 'asc' | 'desc') {
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      ...(search
        ? {
          OR: [{ title: { contains: search, mode: 'insensitive' as any } }],
        }
        : {}),
    };

    const orderObj = orderBy ? ({ [orderBy]: order || 'desc' } as any) : { createdAt: 'desc' };

    const [data, total] = await Promise.all([
      this.lotto.findMany({
        where,
        skip,
        take: limit,
        orderBy: orderObj,
        select: {
          id: true,
          title: true,
          status: true,
          startDate: true,
          endDate: true,
          rewardNumber: true,
          rewardNumberBottom: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.lotto.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    return this.lotto.findFirst({ where: { id, deletedAt: null } });
  }

  async create(data: any) {
    return this.lotto.create({
      data: {
        title: data.title,
        status: data.status ?? 0,
        startDate: data.startDate ? dayjs.tz(data.startDate, 'Asia/Bangkok').toDate() : null,
        endDate: data.endDate ? dayjs.tz(data.endDate, 'Asia/Bangkok').toDate() : null,
      },
    });
  }

  async update(id: number, data: any) {
    const updateData: any = { ...data };
    if (updateData.startDate) updateData.startDate = dayjs.tz(updateData.startDate, 'Asia/Bangkok').toDate();
    if (updateData.endDate) updateData.endDate = dayjs.tz(updateData.endDate, 'Asia/Bangkok').toDate();

    const update = await this.lotto.update({ where: { id }, data: updateData });

    if (!!update) {
      if (update.status === 3) {
        // get reward number and reward number bottom from data
        const rewardNumber = data.rewardNumber;
        const rewardNumberBottom = data.rewardNumberBottom;

        if (rewardNumber && rewardNumberBottom) {
          // list reward number 2 ตัวบน, 2 ตัวล่าง, 3 ตัวบน, 3 ตัวโต๊ด, วิ่งบน, วิ่งล่าง
          const flist = await this.flistRewardNumber(rewardNumber, rewardNumberBottom);

          // 1. list bills by ticketId
          const bills = await this.prisma.bill.findMany({ where: { ticketId: id, deletedAt: null }, select: { id: true } });
          const billIds = bills.map((bill) => bill.id);
          const betBillIds = billIds.map((billId) => BigInt(billId));

          if (billIds.length > 0) {
            // Reset all bets to winnerAmount=0, isLimitNumber=0
            await this.prisma.bet.updateMany({
              where: { billId: { in: betBillIds }, deletedAt: null },
              data: { winnerAmount: 0, isLimitNumber: 0 },
            });

            // Get expanded limit codes for this ticket (all contiguous substrings)
            const limitCodes = await this.limitNumbersService.getLimitCodesForTicket(id);

            // console.log('limitCodes', Array.from(limitCodes));

            // Rules: [categoryId, matchCodes, payRate]
            const rules = [
              { categoryId: 1, matchCodes: [flist[1]], rate: 70 },
              { categoryId: 2, matchCodes: [flist[2]], rate: 70 },
              { categoryId: 3, matchCodes: [flist[3]], rate: 400 },
              { categoryId: 5, matchCodes: flist[5], rate: 80 },
              { categoryId: 6, matchCodes: flist[6], rate: 3 },
              { categoryId: 7, matchCodes: flist[7], rate: 2 }, 
            ];

            for (const rule of rules) {
              const winningBets = await this.prisma.bet.findMany({
                where: {
                  billId: { in: betBillIds },
                  deletedAt: null,
                  lottoCategoryId: rule.categoryId,
                  code: { in: rule.matchCodes },
                },
                select: { id: true, amount: true, code: true },
              });

              await Promise.all(
                winningBets.map(bet => {
                  const isLimit = limitCodes.has(bet.code);
                  const baseAmount = Number(bet.amount) * rule.rate;
                  return this.prisma.bet.update({
                    where: { id: bet.id },
                    data: {
                      winnerAmount: isLimit ? baseAmount / 2 : baseAmount,
                      isLimitNumber: isLimit ? 1 : 0,
                    },
                  });
                })
              );
            }

            // summarize totalWinner for each bill and update
            for (const billId of billIds) {
              const totalWinner = await this.prisma.bet.aggregate({
                where: { billId: BigInt(billId), deletedAt: null },
                _sum: { winnerAmount: true },
              });

              await this.prisma.bill.update({
                where: { id: billId },
                data: { totalWinner: totalWinner._sum.winnerAmount || 0 },
              });
            }
          }
        }
      }
    }

    return update;
  }

  async delete(id: number) {
    return this.lotto.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: new Date() } });
  }

  async findAllWithDeleted() {
    return this.prisma.withDeleted('lottoTicket').findMany();
  }

  async findOnlyDeleted() {
    return this.prisma.onlyDeleted('lottoTicket').findMany();
  }

  async findDeletedById(id: number) {
    return this.prisma.onlyDeleted('lottoTicket').findFirst({ where: { id } });
  }

  async findOnlyAllow() {
    let ticket = await this.lotto.findFirst({
      where: { status: 1, deletedAt: null, startDate: { lte: new Date() }, endDate: { gte: new Date() } },
      select: { id: true, title: true, status: true },
    });

    if (!!ticket) {
        // ถ้าพบ ticket ที่ตรงกับเงื่อนไข ให้ query เพิ่มเลขอั้นของ ticket นั้นมาด้วย
        const limitNumbers = await this.prisma.limitNumber.findMany({
            where: { lottoTicketId: ticket.id, deletedAt: null },
            select: { code: true },
        });

        return {
            ...ticket,
            limitNumbers: limitNumbers.map(ln => ln.code),
        };
    }else{
      return ticket;
    }

  }

  async countDeleted() {
    return this.prisma.onlyDeleted('lottoTicket').count();
  }

  async restore(id: number) {
    return this.prisma.restore('lottoTicket', id);
  }

  async forceDelete(id: number) {
    return this.prisma.forceDelete('lottoTicket', id);
  }

  async forceDeleteOldRecords() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.prisma.forceDeleteMany('lottoTicket', {
      deletedAt: {
        lte: thirtyDaysAgo,
      },
    });
  }

  // prepraere data from reward number
  async flistRewardNumber(rewardNumber: string, rewardNumberBottom: string) {
    if (!/^[0-9]{6}$/.test(rewardNumber)) {
      throw new Error('Reward number must be a 6-digit string');
    }
    if (!/^[0-9]{2}$/.test(rewardNumberBottom)) {
      throw new Error('Reward number bottom must be a 2-digit string');
    }

    // 2 บน คือ เลข 2 ตัวท้ายของ reward number
    const twoDigit = rewardNumber.slice(-2);

    // 2 ล่าง คือ เลข 2 ตัวท้ายของ reward number ล่าง
    const twoDigitBottom = rewardNumberBottom.slice(-2);

    // 3 ตัวบน คือ เลข 3 ตัวท้ายของ reward number
    const threeDigit = rewardNumber.slice(-3);

    // 3 ตัวล่าง คือ เลข 3 ตัวแรกของ reward number
    const threeDigitBottom = rewardNumber.slice(0, 3);

    // 3 ตัวโต๊ด คือ เลข 3 ตัวท้ายของ reward number ทุกชุดที่สลับตำแหน่งได้ (ไม่ซ้ำ)
    const todSet = new Set<string>();
    const arr = threeDigit.split('');
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        for (let k = 0; k < 3; k++) {
          if (i !== j && i !== k && j !== k) {
            todSet.add(arr[i] + arr[j] + arr[k]);
          }
        }
      }
    }
    todSet.delete(threeDigit); // ไม่รวมตรงกับ 3 ตัวบน
    const todList = Array.from(todSet);

    // 3 ตัวโต๊ดแบบ unique (ตัวเลขไม่ซ้ำ)
    const threeDigitTopUnique = Array.from(new Set(threeDigit.split(''))).join('');

    // วิ่งบน คือ array 3 ตัวท้ายของ reward number
    const runTop = threeDigit.split('');

    // วิ่งล่าง คือ array 2 ตัวแรกของ rewardNumberBottom
    const runBottom = rewardNumberBottom.slice(0, 2).split('');

    return { 1: twoDigit, 2: twoDigitBottom, 3: threeDigit, 4: threeDigitBottom, 5: todList, 6: runTop, 7: runBottom };
    
  }
}
