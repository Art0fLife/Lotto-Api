import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, Min, IsArray } from 'class-validator';

export class BetDataListDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @IsIn(
    [
      'id',
      'billId',
      'adminId',
      'rowNumber',
      'lottoCategoryId',
      'code',
      'amount',
      'winnerAmount',
      'createdAt',
      'updatedAt',
      // aliases from UI / legacy payload keys
      'ticketId',
      'ticketTitle',
      'bill_id',
      'rowId',
      'row_id',
      'categoryName',
      'adminName',
    ],
    { each: true },
  )
  @IsString({ each: true })
  orderBy?: string[];

  @IsOptional()
  @IsArray()
  @IsIn(['asc', 'desc'], { each: true })
  order?: ('asc' | 'desc')[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ticketId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  adminIdFilter?: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,3}$/, { message: 'code must be 1-3 digits only' })
  code?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  billId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  lottoCategoryId?: number;

  @IsOptional()
  @Type(() => Boolean)
  isWinner?: boolean;
}
