import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  deviceId: string;

  @IsString()
  @MinLength(4)
  password: string;
}