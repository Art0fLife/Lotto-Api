import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';

export enum BetType {
  TWO_DIGIT = 'two_digit',
  THREE_DIGIT = 'three_digit',
  RUNNING = 'running',
}

export class CreateBetsModalRowDto {
  @IsEnum(BetType)
  betType: BetType;
  @IsString()
  @Matches(/^\d{1,3}$/, { message: 'input1 must be 1-3 digits only' })
  input1: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  input2?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  input3?: number;
}

export class CreateBetsModalDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBetsModalRowDto)
  rows: CreateBetsModalRowDto[];
}
