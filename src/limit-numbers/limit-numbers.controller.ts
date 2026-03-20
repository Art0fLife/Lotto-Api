import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { LimitNumbersService } from './limit-numbers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateLimitNumberDto } from './dto/create-limit-number.dto';
import { Code } from 'typeorm';

@Controller('api/limit-numbers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
export class LimitNumbersController {
  constructor(private readonly service: LimitNumbersService) {}

  @Get()
  async findAll() {
    return this.service.findAll();
  }

  @Post('data-list')
  async dataList(@Body() body: { page?: number | string; limit?: number | string; lotto_ticket_id?: string; code?: string; orderBy?: string; order?: 'asc' | 'desc' }) {
    try {
      console.log('[LimitNumbers] data-list body:', body);
      const pageNum = parseInt(String(body.page || '1'), 10);
      const limitNum = parseInt(String(body.limit || '10'), 10);

      return this.service.findAllPaginated(pageNum, limitNum, body.lotto_ticket_id, body.code, body.orderBy, body.order);
    } catch (err) {
      console.error('[LimitNumbers] data-list error:', err);
      throw err;
    }
  }

  @Post()
  async create(@Body() body: any) {
    // Accept multiple shapes:
    // - array of {lottoTicketId, code}
    // - single {lottoTicketId, code}
    // - batch object { add: [{lottoTicketId, code}], delete: [{lottoTicketId, code}] }

    if (Array.isArray(body)) {
      const items = body.map((b) => ({ lottoTicketId: Number(b.lottoTicketId), code: String(b.code) }));
      return this.service.createMany(items);
    }

    if (body && (body.add || body.delete)) {
      const results: any = {};
      if (Array.isArray(body.add) && body.add.length > 0) {
        const items = body.add.map((b) => ({ lottoTicketId: Number(b.lottoTicketId), code: String(b.code) }));
        results.add = await this.service.createMany(items);
      }

      if (Array.isArray(body.delete) && body.delete.length > 0) {
        // assume delete items include lottoTicketId; group by lottoTicketId
        const grouped: Record<number, string[]> = {};
        for (const d of body.delete) {
          const lid = Number(d.lottoTicketId);
          const code = String(d.code);
          if (!grouped[lid]) grouped[lid] = [];
          grouped[lid].push(code);
        }

        results.delete = {};
        for (const lidStr of Object.keys(grouped)) {
          const lid = Number(lidStr);
          results.delete[lid] = await this.service.deleteByCodes(lid, grouped[lid]);
        }
      }

      return results;
    }

    return this.service.create({ lottoTicketId: Number(body.lottoTicketId), code: String(body.code) } as any);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.service.delete(parseInt(id, 10));
  }
}
