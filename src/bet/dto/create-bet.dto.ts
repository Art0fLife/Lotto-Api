import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsString, Matches, Max, Min } from 'class-validator';

export class CreateBetDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(32767)
  adminId: number;

  @IsString()
  @Matches(/^\d+$/, { message: 'billId must contain digits only' })
  billId: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  rowNumber: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  lottoCategoryId: number;

  @IsString()
  @Matches(/^\d{1,3}$/, { message: 'code must be 1-3 digits only' })
  code: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;
}
