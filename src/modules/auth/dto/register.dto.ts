import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums';

export class CreateDokanDto {
  @ApiProperty({ example: 'Hasan\u2019s Cha Ghor', description: 'Shop display name.' })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'cafe',
    description: 'Shop category (free-text, e.g. cafe, apparel, grocery).',
  })
  @IsString()
  category: string;

  @ApiProperty({
    example: 'Road 12, Dhanmondi, Dhaka',
    description: 'Physical address of the shop.',
  })
  @IsString()
  address: string;

  @ApiProperty({
    example: 'Third-wave specialty cafe serving single-origin coffee.',
    description: 'Short description shown on the public shop page.',
  })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    example: 'https://cdn.khata.app/logos/cha-ghor.png',
    description: 'HTTPS URL to the shop logo (optional).',
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  logoUrl?: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'grahok@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'hunter22',
    minLength: 6,
    description: 'Plain-text password; min 6 chars. Server hashes with bcrypt.',
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Hasan Mahmud' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '+8801712345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    enum: [UserRole.GRAHOK, UserRole.DOKANDAR],
    description:
      'Role to register as. SUPER_ADMIN is not self-serve and cannot be requested here.',
  })
  @IsIn([UserRole.GRAHOK, UserRole.DOKANDAR])
  role: UserRole.GRAHOK | UserRole.DOKANDAR;

  @ApiPropertyOptional({
    type: () => CreateDokanDto,
    description:
      'Required when `role` is `DOKANDAR`; ignored when role is `GRAHOK`. The Dokan is created in the same transaction as the user.',
  })
  @ValidateIf((o) => o.role === UserRole.DOKANDAR)
  @ValidateNested()
  @Type(() => CreateDokanDto)
  dokan?: CreateDokanDto;
}

export class LoginDto {
  @ApiProperty({ example: 'grahok@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'hunter22' })
  @IsString()
  password: string;
}
