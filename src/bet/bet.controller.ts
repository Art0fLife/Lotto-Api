import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { BetService } from './bet.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BetDataListDto } from './dto/bet-data-list.dto';
import { CreateBetDto } from './dto/create-bet.dto';
import { UpdateBetDto } from './dto/update-bet.dto';
import { CreateBetsModalDto } from './dto/create-bets-modal.dto';

@Controller('api/bets')
@UseGuards(JwtAuthGuard)
export class BetController {
  constructor(private readonly betService: BetService) {}

  private parseId(id: string): bigint {
    try {
      return BigInt(id);
    } catch {
      throw new BadRequestException('Invalid bet id');
    }
  }

  private parseBillId(billId?: string | number): number | undefined {
    if (billId === undefined || billId === null || billId === '') return undefined;
    const parsedBillId = Number(billId);
    if (!Number.isInteger(parsedBillId) || parsedBillId <= 0) {
      throw new BadRequestException('Invalid bill_id');
    }
    return parsedBillId;
  }

  @Get()
  async findAll(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);
    const adminId = req.user?.sub;
    const roleId = req.user?.roleId;
    if (page || limit) return this.betService.findAllPaginated(pageNum, limitNum, search, undefined, undefined, adminId, roleId);
    return this.betService.findAll(adminId, roleId);
  }

  @Post('data-list')
  async dataList(@Req() req: any, @Body() body: BetDataListDto) {
    const pageNum = body.page ?? 1;
    const limitNum = body.limit ?? 10;
    const adminId = req.user?.sub;
    const roleId = req.user?.roleId;
    return this.betService.findAllPaginated(pageNum, limitNum, body.search, body.orderBy, body.order, adminId, roleId, {
      ticketId: body.ticketId,
      adminIdFilter: body.adminIdFilter,
      code: body.code,
      billId: body.billId,
      lottoCategoryId: body.lottoCategoryId,
      isWinner: body.isWinner,
    });
  }

  @Get('allow-bet')
  async isAllowBet() {
    const allowBet = await this.betService.isAllowBet();
    return { allowBet };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    // raw query to get bet with related bill and lotto category data
    const bet = await this.betService.findOneWithRelations(this.parseId(id));
    if (!bet) {
      throw new BadRequestException('Bet not found');
    }
    return bet;
  }

  @Post()
  async create(@Body() data: CreateBetDto) {
    return this.betService.create(data);
  }

  @Post('create-from-modal')
  async createFromModal(@Req() req: any, @Body() data: CreateBetsModalDto) {
    return this.betService.createFromModal(req.user.sub, data);
  }

  @Post('mock-random-bills')
  async createMockRandomBills(@Req() req: any) {
    return this.betService.generateMockRandomBillsForAdmin(req.user.sub);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Req() req: any, @Body() data: UpdateBetDto) {
    const existingBet = await this.betService.findOne(this.parseId(id));
    if (!existingBet) {
      throw new BadRequestException('Bet not found');
    }
    // allow only owner admin or superadmin to update
    if (existingBet.adminId !== req.user.sub && req.user.roleId !== 1) {
      throw new BadRequestException('You do not have permission to update this bet');
    }

    const result = await this.betService.update(this.parseId(id), data);
    if (!result) {
      throw new BadRequestException('Failed to update bet');
    }

    // update total bet amount for the associated bill if bet amount or bet type changed
    // if ((data.amount !== undefined && data.amount !== existingBet.amount) || (data.betTypeId !== undefined && data.betTypeId !== existingBet.betTypeId)) {
    //   await this.betService.updateBillTotalAmount(existingBet.billId);
    // }

    return result;

  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Query('bill_id') billId?: string) {
    return this.betService.delete(this.parseId(id), this.parseBillId(billId));
  }

  @Post('delete')
  async deleteViaPostBody(@Body() body: { id: string | number; billId?: number; bill_id?: number }) {
    if (body?.id === undefined || body?.id === null || body?.id === '') {
      throw new BadRequestException('Invalid bet id');
    }
    const billId = this.parseBillId(body?.billId ?? body?.bill_id);
    return this.betService.delete(this.parseId(String(body.id)), billId);
  }

  @Post(':id/delete')
  async deleteViaPost(@Param('id') id: string, @Body() body: { billId?: number; bill_id?: number }) {
    const billId = this.parseBillId(body?.billId ?? body?.bill_id);
    return this.betService.delete(this.parseId(id), billId);
  }

  @Get('with-deleted/all')
  async findAllWithDeleted() {
    return this.betService.findAllWithDeleted();
  }

  @Get('only-deleted/all')
  async findOnlyDeleted() {
    return this.betService.findOnlyDeleted();
  }

  @Get('only-deleted/:id')
  async findDeletedById(@Param('id') id: string) {
    return this.betService.findDeletedById(this.parseId(id));
  }

  @Get('deleted/count')
  async countDeleted() {
    const count = await this.betService.countDeleted();
    return { count };
  }

  @Post(':id/restore')
  async restore(@Param('id') id: string) {
    return this.betService.restore(this.parseId(id));
  }

  @Delete(':id/force')
  async forceDelete(@Param('id') id: string) {
    return this.betService.forceDelete(this.parseId(id));
  }

  @Delete('force-delete-old/cleanup')
  async forceDeleteOldRecords() {
    return this.betService.forceDeleteOldRecords();
  }
}
