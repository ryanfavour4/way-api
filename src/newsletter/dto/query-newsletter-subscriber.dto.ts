import { IsEnum, IsOptional, IsString } from 'class-validator';
import { NewsletterSubscriberStatus } from '../entities/newsletter-subscriber.entity';

export class QueryNewsletterSubscriberDto {
  @IsOptional()
  @IsEnum(NewsletterSubscriberStatus, {
    message: 'Status must be one of: subscribed, unsubscribed',
  })
  status?: NewsletterSubscriberStatus;

  @IsOptional()
  @IsString()
  search?: string;
}
