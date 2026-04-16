import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoyaltyTier } from '../../../common/enums';

export class UpdateKhataNotesDto {
  @ApiProperty({
    example: 'Prefers evening pickups. Allergic to peanuts.',
    maxLength: 2000,
    description: 'Private Dokandar-only notes about the customer.',
  })
  @IsString()
  @MaxLength(2000)
  dokandarNotes: string;
}

export class UpdateKhataTierDto {
  @ApiPropertyOptional({
    enum: LoyaltyTier,
    nullable: true,
    description:
      'Set to a tier to force it; pass `null` to clear the override and let the auto-computed tier take effect.',
  })
  @IsOptional()
  @IsEnum(LoyaltyTier)
  manualTierOverride: LoyaltyTier | null;
}
