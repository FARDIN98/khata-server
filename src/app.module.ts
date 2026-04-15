import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { typeOrmConfig } from './config/typeorm.config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DokansModule } from './modules/dokans/dokans.module';
import { DokanEventsModule } from './modules/dokan-events/dokan-events.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AdminModule } from './modules/admin/admin.module';
import { CustomerKhatasModule } from './modules/customer-khatas/customer-khatas.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => typeOrmConfig(config),
    }),
    AuthModule,
    UsersModule,
    DokansModule,
    DokanEventsModule,
    BookingsModule,
    ReviewsModule,
    InvitationsModule,
    PaymentsModule,
    AdminModule,
    CustomerKhatasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
