import { Module } from '@nestjs/common';
import { BillController } from './bill.controller';
import { BillService } from './bill.service';
import { PrismaService } from '../prisma.service';
import { SummaryModule } from '../summary/summary.module';

@Module({
  imports: [SummaryModule],
  controllers: [BillController],
  providers: [BillService, PrismaService],
  exports: [BillService],
})
export class BillModule {}
