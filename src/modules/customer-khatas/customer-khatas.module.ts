import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerKhata } from '../../entities/customer-khata.entity';
import { CustomerKhatasController } from './customer-khatas.controller';
import { CustomerKhatasService } from './customer-khatas.service';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerKhata])],
  controllers: [CustomerKhatasController],
  providers: [CustomerKhatasService],
  exports: [CustomerKhatasService],
})
export class CustomerKhatasModule {}
