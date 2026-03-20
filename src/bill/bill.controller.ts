import { BadRequestException, Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { BillService } from './bill.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/bills')
@UseGuards(JwtAuthGuard)
export class BillController {
  constructor(private readonly billService: BillService) {}

  private parseId(id?: string | number): number {
    const parsedId = Number(id);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw new BadRequestException('Invalid bill id');
    }
    return parsedId;
  }

  @Get()
  async findAll(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);
    const adminId = req.user?.sub;
    const roleId = req.user?.roleId;
    if (page || limit) {
      return this.billService.findAllPaginated(pageNum, limitNum, search, undefined, undefined, adminId, roleId);
    }
    return this.billService.findAll(adminId, roleId);
  }

  @Post('data-list')
  async dataList(
    @Req() req: any,
    @Body()
    body: {
      page?: number | string;
      limit?: number | string;
      search?: string;
      orderBy?: string | string[];
      order?: 'asc' | 'desc' | ('asc' | 'desc')[];
      ticketId?: number;
      adminIdFilter?: number;
      billId?: number;
      isWinner?: boolean;
    },
  ) {
    const pageNum = parseInt(String(body.page || '1'), 10);
    const limitNum = parseInt(String(body.limit || '10'), 10);
    const adminId = req.user?.sub;
    const roleId = req.user?.roleId;
    const isWinner = body.isWinner;

    const normalizedOrderBy = Array.isArray(body.orderBy)
      ? body.orderBy
      : body.orderBy
        ? [body.orderBy]
        : undefined;
    const normalizedOrder = Array.isArray(body.order)
      ? body.order
      : body.order
        ? [body.order]
        : undefined;

    return this.billService.findAllPaginated(pageNum, limitNum, body.search, normalizedOrderBy, normalizedOrder, adminId, roleId, {
      ticketId: body.ticketId,
      adminIdFilter: body.adminIdFilter,
      billId: body.billId,
      isWinner: body.isWinner,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.billService.findOne(this.parseId(id));
  }

  @Get(':id/bets')
  async findOneWithBets(@Param('id') id: string) {
    return this.billService.findOneWithBets(this.parseId(id));
  }

  @Post()
  async create(@Body() data: any) {
    return this.billService.create(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.billService.update(this.parseId(id), data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.billService.delete(this.parseId(id));
  }

  @Post('delete')
  async deleteViaPostBody(@Body() body: { id: string | number }) {
    if (body?.id === undefined || body?.id === null || body?.id === '') {
      throw new BadRequestException('Invalid bill id');
    }
    return this.billService.delete(this.parseId(body.id));
  }

  @Post(':id/delete')
  async deleteViaPost(@Param('id') id: string) {
    return this.billService.delete(this.parseId(id));
  }

  @Get('with-deleted/all')
  async findAllWithDeleted() {
    return this.billService.findAllWithDeleted();
  }

  @Get('only-deleted/all')
  async findOnlyDeleted() {
    return this.billService.findOnlyDeleted();
  }

  @Get('only-deleted/:id')
  async findDeletedById(@Param('id') id: string) {
    return this.billService.findDeletedById(parseInt(id, 10));
  }

  @Get('deleted/count')
  async countDeleted() {
    const count = await this.billService.countDeleted();
    return { count };
  }

  @Post(':id/restore')
  async restore(@Param('id') id: string) {
    return this.billService.restore(parseInt(id, 10));
  }

  @Delete(':id/force')
  async forceDelete(@Param('id') id: string) {
    return this.billService.forceDelete(parseInt(id, 10));
  }

  @Delete('force-delete-old/cleanup')
  async forceDeleteOldRecords() {
    return this.billService.forceDeleteOldRecords();
  }
}
