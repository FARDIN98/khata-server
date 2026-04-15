import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { LoyaltyTier } from '../../../common/enums';

export class UpdateKhataNotesDto {
  @IsString()
  @MaxLength(2000)
  dokandarNotes: string;
}

export class UpdateKhataTierDto {
  @IsOptional()
  @IsEnum(LoyaltyTier)
  manualTierOverride: LoyaltyTier | null;
}
