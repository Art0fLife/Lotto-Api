import { Module } from '@nestjs/common';
import { SummaryController } from './summary-controller';
import { SummaryService } from './summary-service';
import { PrismaService } from '../prisma.service';
import { LimitNumbersModule } from '../limit-numbers/limit-numbers.module';

@Module({
  imports: [LimitNumbersModule],
  controllers: [SummaryController],
  providers: [SummaryService, PrismaService],
  exports: [SummaryService],
})
export class SummaryModule {}
