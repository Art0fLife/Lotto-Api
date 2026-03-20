import { Module } from '@nestjs/common';
import { BetController } from './bet.controller';
import { BetService } from './bet.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [BetController],
  providers: [BetService, PrismaService],
  exports: [BetService],
})
export class BetModule {}
