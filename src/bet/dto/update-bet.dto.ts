import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class UpdateBetDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(32767)
  adminId?: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'billId must contain digits only' })
  billId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  rowNumber?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lottoCategoryId?: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,3}$/, { message: 'code must be 1-3 digits only' })
  code?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount?: number;
}
