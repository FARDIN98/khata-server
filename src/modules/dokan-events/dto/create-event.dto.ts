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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventType, LoyaltyTier, Visibility } from '../../../common/enums';

export class CreateDokanEventDto {
  @ApiProperty({ example: 'Eid Sample Sale', maxLength: 150 })
  @IsString()
  @MaxLength(150)
  title: string;

  @ApiProperty({ enum: EventType, example: EventType.SAMPLE_SALE })
  @IsEnum(EventType)
  type: EventType;

  @ApiProperty({
    example: 'Gulshan 2 Pop-up Space, Dhaka',
    maxLength: 200,
    description: 'Free-text venue description.',
  })
  @IsString()
  @MaxLength(200)
  venue: string;

  @ApiPropertyOptional({
    example: 'https://khata.app/events/eid-sample-sale',
    description: 'Optional external URL for the event.',
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  eventLink?: string;

  @ApiProperty({
    example: '2026-05-10T18:00:00.000Z',
    description: 'ISO-8601 timestamp when the event starts.',
  })
  @IsDateString()
  scheduledAt: string;

  @ApiProperty({ maxLength: 5000, example: 'An evening of hand-block-printed samples at 40% off retail.' })
  @IsString()
  @MaxLength(5000)
  description: string;

  @ApiProperty({
    enum: Visibility,
    description:
      '`PUBLIC` (anyone may book) or `LOYALTY` (only customers at or above `minTier`).',
  })
  @IsEnum(Visibility)
  visibility: Visibility;

  @ApiPropertyOptional({
    enum: LoyaltyTier,
    description:
      'Minimum loyalty tier required to book; required when `visibility` is `LOYALTY`.',
  })
  @ValidateIf((o) => o.visibility === Visibility.LOYALTY)
  @IsEnum(LoyaltyTier)
  minTier?: LoyaltyTier;

  @ApiProperty({
    example: 50000,
    minimum: 0,
    description:
      'Fee in paisa (1 taka = 100 paisa). Set 0 for a free event; anything >0 routes bookings through Stripe checkout.',
  })
  @IsInt()
  @Min(0)
  feeInPaisa: number;

  @ApiPropertyOptional({
    example: 30,
    minimum: 1,
    description: 'Maximum number of active bookings. Omit for default.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({
    description: 'When true, highlights the event on the public home page.',
  })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
