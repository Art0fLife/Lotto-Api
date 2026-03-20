import { BadRequestException, Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { SummaryService } from './summary-service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/summary')
@UseGuards(JwtAuthGuard)
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @Get('bills')
  async billsSummary(@Req() req: any, @Query('ticketId') ticketId?: string, @Query('topN') topN?: string, @Query('overBet') overBet?: string) {
    let parsedTicketId: number | undefined;
    let parsedTopN = 10;
    let parsedOverBet = 500;

    if (ticketId !== undefined && ticketId !== null && ticketId !== '') {
      const numericTicketId = Number(ticketId);
      if (!Number.isInteger(numericTicketId) || numericTicketId <= 0) {
        throw new BadRequestException('Invalid ticket id');
      }
      parsedTicketId = numericTicketId;
    }

    if (topN !== undefined && topN !== null && topN !== '') {
      const numericTopN = Number(topN);
      if (!Number.isInteger(numericTopN) || numericTopN <= 0) {
        throw new BadRequestException('Invalid topN');
      }
      parsedTopN = Math.min(numericTopN, 100);
    }

    if (overBet !== undefined && overBet !== null && overBet !== '') {
      const numericOverBet = Number(overBet);
      if (!Number.isInteger(numericOverBet) || numericOverBet <= 0) {
        throw new BadRequestException('Invalid overBet');
      }
      parsedOverBet = numericOverBet;
    }

    if (req.user?.roleId !== 1) {
      return this.summaryService.getBillsSummaryUser(req.user?.sub, parsedTicketId);
    }else if (req.user?.roleId === 1) {
      return this.summaryService.getBillsSummarySuperAdmin(req.user?.sub, req.user?.roleId, parsedTicketId, parsedTopN, parsedOverBet);
    }
    
  }
}
