import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { EventType, LoyaltyTier, Visibility } from '../../../common/enums';

export class CreateDokanEventDto {
  @IsString()
  @MaxLength(150)
  title: string;

  @IsEnum(EventType)
  type: EventType;

  @IsString()
  @MaxLength(200)
  venue: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  eventLink?: string;

  @IsDateString()
  scheduledAt: string;

  @IsString()
  @MaxLength(5000)
  description: string;

  @IsEnum(Visibility)
  visibility: Visibility;

  @ValidateIf((o) => o.visibility === Visibility.LOYALTY)
  @IsEnum(LoyaltyTier)
  minTier?: LoyaltyTier;

  @IsInt()
  @Min(0)
  feeInPaisa: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
