import { IsEmail, IsEnum, IsOptional, IsString, MinLength, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../../../common/enums';

export class CreateDokanDto {
  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsString()
  address: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(UserRole)
  role: UserRole.GRAHOK | UserRole.DOKANDAR;

  @ValidateIf((o) => o.role === UserRole.DOKANDAR)
  @ValidateNested()
  @Type(() => CreateDokanDto)
  dokan?: CreateDokanDto;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
