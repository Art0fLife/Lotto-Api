import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { LottoService } from './lotto.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('api/tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin', 'admin')
export class LottoController {
  constructor(private readonly lottoService: LottoService) {}

  @Get()
  @Roles('superadmin', 'admin', 'user')
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);

    if (page || limit) return this.lottoService.findAllPaginated(pageNum, limitNum, search);
    return this.lottoService.findAll();
  }

  @Get('options')
  @Roles('superadmin', 'admin', 'user')
  async getActiveOptions() {
    return this.lottoService.findActiveOptions();
  }

  @Get('categories')
  @Roles('superadmin', 'admin', 'user')
  async getCategories() {
    return this.lottoService.findAllCategories();
  }

  @Post('data-list')
  async dataList(@Body() body: { page?: number | string; limit?: number | string; search?: string; orderBy?: string; order?: 'asc' | 'desc' }) {
    const pageNum = parseInt(String(body.page || '1'), 10);
    const limitNum = parseInt(String(body.limit || '10'), 10);

    return this.lottoService.findAllPaginated(pageNum, limitNum, body.search, body.orderBy, body.order);
  }

  // Block number endpoints removed

  @Get('only-allow')
  async findOnlyAllow() {
    return this.lottoService.findOnlyAllow();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.lottoService.findOne(parseInt(id, 10));
  }

  @Post()
  async create(@Body() data: any) {
    return this.lottoService.create(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.lottoService.update(parseInt(id, 10), data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.lottoService.delete(parseInt(id, 10));
  }

  @Get('with-deleted/all')
  async findAllWithDeleted() {
    return this.lottoService.findAllWithDeleted();
  }

  @Get('only-deleted/all')
  async findOnlyDeleted() {
    return this.lottoService.findOnlyDeleted();
  }

  @Get('only-deleted/:id')
  async findDeletedById(@Param('id') id: string) {
    return this.lottoService.findDeletedById(parseInt(id, 10));
  }

  @Get('deleted/count')
  async countDeleted() {
    const count = await this.lottoService.countDeleted();
    return { count };
  }

  @Post(':id/restore')
  async restore(@Param('id') id: string) {
    return this.lottoService.restore(parseInt(id, 10));
  }

  @Delete(':id/force')
  async forceDelete(@Param('id') id: string) {
    return this.lottoService.forceDelete(parseInt(id, 10));
  }

  @Delete('force-delete-old/cleanup')
  async forceDeleteOldRecords() {
    return this.lottoService.forceDeleteOldRecords();
  }

  
}
