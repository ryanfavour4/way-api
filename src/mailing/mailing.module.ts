import { Module } from '@nestjs/common';
import { MailingService } from './mailing.service';
import { MailingController } from './mailing.controller';
import { Mailing } from './entities/mailing.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Mailing])],
  controllers: [MailingController],
  providers: [MailingService],
  exports: [MailingService], // 👈 VERY IMPORTANT
})
export class MailingModule {}
