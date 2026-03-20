import { Module } from '@nestjs/common';
import { LimitNumbersService } from './limit-numbers.service';
import { LimitNumbersController } from './limit-numbers.controller';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [],
  controllers: [LimitNumbersController],
  providers: [LimitNumbersService, PrismaService],
  exports: [LimitNumbersService],
})
export class LimitNumbersModule {}
