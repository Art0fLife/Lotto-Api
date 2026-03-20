import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { AdminModule } from './admin/admin.module';
import { LottoModule } from './lotto/lotto.module';
import { AuthModule } from './auth/auth.module';
import { BetModule } from './bet/bet.module'; 
import { BillModule } from './bill/bill.module';
import { SummaryModule } from './summary/summary.module';
import { LimitNumbersModule } from './limit-numbers/limit-numbers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AdminModule,
    LottoModule,
    AuthModule,
    BetModule,
    BillModule,
    SummaryModule,
    LimitNumbersModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
