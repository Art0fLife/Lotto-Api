import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @MinLength(8)
  deviceId: string;

  @IsString()
  @MinLength(20)
  refreshToken: string;
}
