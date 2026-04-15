import { IsEmail, IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength, ValidateIf, ValidateNested } from 'class-validator';
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
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
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

  @IsIn([UserRole.GRAHOK, UserRole.DOKANDAR])
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
