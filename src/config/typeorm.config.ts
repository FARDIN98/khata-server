import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { Dokan } from '../entities/dokan.entity';
import { DokanEvent } from '../entities/dokan-event.entity';
import { CustomerKhata } from '../entities/customer-khata.entity';
import { Booking } from '../entities/booking.entity';
import { Invitation } from '../entities/invitation.entity';
import { Review } from '../entities/review.entity';

export const typeOrmConfig = (config: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: config.get<string>('DATABASE_URL'),
  entities: [User, Dokan, DokanEvent, CustomerKhata, Booking, Invitation, Review],
  synchronize: config.get<string>('NODE_ENV') !== 'production',
  ssl: { rejectUnauthorized: false },
  logging: config.get<string>('NODE_ENV') !== 'production' ? ['error', 'warn'] : ['error'],
});
