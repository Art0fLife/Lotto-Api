import { Module } from '@nestjs/common';
import { LottoController } from './lotto.controller';
import { LottoService } from './lotto.service';
import { PrismaService } from '../prisma.service';
import { LimitNumbersModule } from '../limit-numbers/limit-numbers.module';

@Module({
  imports: [LimitNumbersModule],
  controllers: [LottoController],
  providers: [LottoService, PrismaService],
  exports: [LottoService],
})
export class LottoModule {}
