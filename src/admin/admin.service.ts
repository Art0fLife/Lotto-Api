import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // =====================================
  // CRUD ปกติ (auto soft delete)
  // =====================================

  async findAll() {
    // ดึงเฉพาะรายการที่ยังไม่ถูก soft delete
    return this.prisma.admin.findMany({
      where: { deletedAt: null },
    });
  }

  async findNonSuperadminOptions() {
    return this.prisma.admin.findMany({
      where: { deletedAt: null, roleId: { not: 1 } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async findAllPaginated(
    page: number,
    limit: number,
    search?: string,
    orderBy?: string,
    order?: 'asc' | 'desc',
  ) {
    const skip = (page - 1) * limit;

    const where = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as any } },
              { email: { contains: search, mode: 'insensitive' as any } },
            ],
          }
        : {}),
    };

    const orderObj = orderBy
      ? ({ [orderBy]: order || 'desc' } as any)
      : { createdAt: 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.admin.findMany({
        where,
        skip,
        take: limit,
        orderBy: orderObj,
        select: {
          id: true,
          name: true,
          email: true,
          roleId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.admin.count({ where }),
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
    return this.prisma.admin.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  async create(data: { name: string; email: string; password: string; roleId?: number; status?: number }) {
    const hashedPassword = await bcrypt.hash(data.password, 12);

    return this.prisma.admin.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        roleId: data.roleId ?? 2,
        status: data.status ?? 1,
        updatedAt: new Date(),
      },
    });
  }

  async update(id: number, data: any) {
    const updateData = { ...data };

    if (typeof updateData.password === 'string' && updateData.password.trim() !== '') {
      updateData.password = await bcrypt.hash(updateData.password, 12);
    }

    // ensure updatedAt is set when updating record
    updateData.updatedAt = new Date();

    return this.prisma.admin.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: number) {
    // Soft delete แบบ explicit: ไม่ลบข้อมูลจริง
    return this.prisma.admin.updateMany({
      where: {
        id,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  // =====================================
  // SOFT DELETE PRO METHODS
  // =====================================

  /**
   * ดึงข้อมูลทั้งหมดรวมที่ถูกลบ
   */
  async findAllWithDeleted() {
    return this.prisma.withDeleted('admin').findMany();
  }

  /**
   * ดึงเฉพาะข้อมูลที่ถูกลบ
   */
  async findOnlyDeleted() {
    return this.prisma.onlyDeleted('admin').findMany();
  }

  /**
   * ดึงข้อมูลที่ถูกลบตาม ID
   */
  async findDeletedById(id: number) {
    return this.prisma.onlyDeleted('admin').findFirst({
      where: { id },
    });
  }

  /**
   * นับจำนวนที่ถูกลบ
   */
  async countDeleted() {
    return this.prisma.onlyDeleted('admin').count();
  }

  /**
   * กลับคืนข้อมูลที่ถูกลบ
   */
  async restore(id: number) {
    return this.prisma.restore('admin', id);
  }

  /**
   * กลับคืนข้อมูลหลายรายการตาม email
   */
  async restoreByEmail(email: string) {
    return this.prisma.restoreMany('admin', { email });
  }

  /**
   * ลบถาวร
   */
  async forceDelete(id: number) {
    return this.prisma.forceDelete('admin', id);
  }

  /**
   * ลบถาวรข้อมูลที่ถูก soft delete มานานกว่า 30 วัน
   */
  async forceDeleteOldRecords() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.prisma.forceDeleteMany('admin', {
      deletedAt: {
        lte: thirtyDaysAgo,
      },
    });
  }
}
