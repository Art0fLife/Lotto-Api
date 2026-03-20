import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma.service';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  controllers: [AdminController],
  providers: [AdminService, PrismaService, RolesGuard],
  exports: [AdminService],
})
export class AdminModule {}
