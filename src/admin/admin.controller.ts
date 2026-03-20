import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('api/admins')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin', 'admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  // =====================================
  // CRUD ปกติ
  // =====================================

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);

    if (page || limit) {
      return this.adminService.findAllPaginated(pageNum, limitNum, search);
    }

    return this.adminService.findAll();
  }

  @Get('options')
  async getNonSuperadminOptions() {
    return this.adminService.findNonSuperadminOptions();
  }

  @Post('data-list')
  async dataList(
    @Body() body: { page?: number | string; limit?: number | string; search?: string; orderBy?: string; order?: 'asc' | 'desc' },
  ) {
    const pageNum = parseInt(String(body.page || '1'), 10);
    const limitNum = parseInt(String(body.limit || '10'), 10);

    return this.adminService.findAllPaginated(pageNum, limitNum, body.search, body.orderBy, body.order);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.adminService.findOne(parseInt(id));
  }

  @Post()
  async create(
    @Body() data: { name: string; email: string; password: string; roleId?: number; status?: number },
  ) {
    return this.adminService.create(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.adminService.update(parseInt(id), data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.adminService.delete(parseInt(id));
  }

  // =====================================
  // SOFT DELETE PRO ENDPOINTS
  // =====================================

  /**
   * GET /api/admins/with-deleted
   * ดึงข้อมูลทั้งหมดรวมที่ถูกลบ
   */
  @Get('with-deleted/all')
  async findAllWithDeleted() {
    return this.adminService.findAllWithDeleted();
  }

  /**
   * GET /api/admins/only-deleted
   * ดึงเฉพาะข้อมูลที่ถูกลบ
   */
  @Get('only-deleted/all')
  async findOnlyDeleted() {
    return this.adminService.findOnlyDeleted();
  }

  /**
   * GET /api/admins/only-deleted/:id
   * ดึงข้อมูลที่ถูกลบตาม ID
   */
  @Get('only-deleted/:id')
  async findDeletedById(@Param('id') id: string) {
    return this.adminService.findDeletedById(parseInt(id));
  }

  /**
   * GET /api/admins/deleted/count
   * นับจำนวนที่ถูกลบ
   */
  @Get('deleted/count')
  async countDeleted() {
    const count = await this.adminService.countDeleted();
    return { count };
  }

  /**
   * POST /api/admins/:id/restore
   * กลับคืนข้อมูลที่ถูกลบ
   */
  @Post(':id/restore')
  async restore(@Param('id') id: string) {
    return this.adminService.restore(parseInt(id));
  }

  /**
   * POST /api/admins/restore-by-email
   * กลับคืนข้อมูลตาม email
   */
  @Post('restore-by-email')
  async restoreByEmail(@Body() data: { email: string }) {
    return this.adminService.restoreByEmail(data.email);
  }

  /**
   * DELETE /api/admins/:id/force
   * ลบถาวร (permanent delete)
   */
  @Delete(':id/force')
  async forceDelete(@Param('id') id: string) {
    return this.adminService.forceDelete(parseInt(id));
  }

  /**
   * DELETE /api/admins/force-delete-old
   * ลบถาวรข้อมูลเก่าที่ soft delete มานานกว่า 30 วัน
   */
  @Delete('force-delete-old/cleanup')
  async forceDeleteOldRecords() {
    return this.adminService.forceDeleteOldRecords();
  }
}
