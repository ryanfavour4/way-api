import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsletterSubscriber } from './entities/newsletter-subscriber.entity';
import { NewsletterService } from './newsletter.service';
import { NewsletterController } from './newsletter.controller';
import { User } from 'src/users/entities/users.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NewsletterSubscriber, User])],
  controllers: [NewsletterController],
  providers: [NewsletterService],
  exports: [NewsletterService, TypeOrmModule],
})
export class NewsletterModule {}
