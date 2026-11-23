import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NewsletterSubscriber,
  NewsletterSubscriberStatus,
} from './entities/newsletter-subscriber.entity';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';
import { UnsubscribeNewsletterDto } from './dto/unsubscribe-newsletter.dto';
import {
  paginate,
  PaginateQuery,
  Paginated,
  FilterOperator,
} from 'nestjs-paginate';

@Injectable()
export class NewsletterService {
  constructor(
    @InjectRepository(NewsletterSubscriber)
    private readonly subscriberRepo: Repository<NewsletterSubscriber>,
  ) {}

  /**
   * Helper: Normalize email address
   */
  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /**
   * 1. Public Subscription Endpoint Logic
   * POST /newsletter/subscribe
   */
  async subscribe(
    dto: SubscribeNewsletterDto,
  ): Promise<{ message: string; status: NewsletterSubscriberStatus }> {
    // 1. Consent validation
    if (dto.consent !== true) {
      throw new BadRequestException(
        'Consent is required to subscribe to the newsletter.',
      );
    }

    // 2. Email validation & normalization
    if (!dto.email || typeof dto.email !== 'string') {
      throw new BadRequestException('A valid email address is required.');
    }

    const normalizedEmail = this.normalizeEmail(dto.email);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      throw new BadRequestException('A valid email address is required.');
    }

    // 3. Check for existing subscriber
    const existing = await this.subscriberRepo.findOne({
      where: { email: normalizedEmail },
    });

    if (existing) {
      // Reactivate if unsubscribed
      if (existing.status === NewsletterSubscriberStatus.UNSUBSCRIBED) {
        existing.status = NewsletterSubscriberStatus.SUBSCRIBED;
        await this.subscriberRepo.save(existing);
        return {
          message: 'Successfully resubscribed to the newsletter.',
          status: NewsletterSubscriberStatus.SUBSCRIBED,
        };
      }

      // If already subscribed, handle duplicate gracefully without creating a duplicate record
      return {
        message: 'Email is already subscribed to the newsletter.',
        status: NewsletterSubscriberStatus.SUBSCRIBED,
      };
    }

    // 4. Create new subscriber
    const newSubscriber = this.subscriberRepo.create({
      email: normalizedEmail,
      status: NewsletterSubscriberStatus.SUBSCRIBED,
    });

    await this.subscriberRepo.save(newSubscriber);

    return {
      message: 'Successfully subscribed to the newsletter.',
      status: NewsletterSubscriberStatus.SUBSCRIBED,
    };
  }

  /**
   * 2. Public Unsubscribe Endpoint Logic
   * POST /newsletter/unsubscribe
   */
  async unsubscribe(
    dto: UnsubscribeNewsletterDto,
  ): Promise<{ message: string; status: NewsletterSubscriberStatus }> {
    if (!dto.email || typeof dto.email !== 'string') {
      throw new BadRequestException('A valid email address is required.');
    }

    const normalizedEmail = this.normalizeEmail(dto.email);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      throw new BadRequestException('A valid email address is required.');
    }

    const subscriber = await this.subscriberRepo.findOne({
      where: { email: normalizedEmail },
    });

    if (!subscriber) {
      throw new NotFoundException(
        'Newsletter subscriber with this email address was not found.',
      );
    }

    if (subscriber.status === NewsletterSubscriberStatus.UNSUBSCRIBED) {
      return {
        message: 'Email is already unsubscribed from the newsletter.',
        status: NewsletterSubscriberStatus.UNSUBSCRIBED,
      };
    }

    subscriber.status = NewsletterSubscriberStatus.UNSUBSCRIBED;
    await this.subscriberRepo.save(subscriber);

    return {
      message: 'Successfully unsubscribed from the newsletter.',
      status: NewsletterSubscriberStatus.UNSUBSCRIBED,
    };
  }

  /**
   * 3. Admin Management: Paginated list with filtering & search
   * GET /newsletter/admin/subscribers
   */
  async findAll(
    query: PaginateQuery,
  ): Promise<Paginated<NewsletterSubscriber>> {
    const queryBuilder = this.subscriberRepo.createQueryBuilder('subscriber');

    return paginate(query, queryBuilder, {
      sortableColumns: ['id', 'email', 'status', 'created_at', 'updated_at'],
      searchableColumns: ['email'],
      filterableColumns: {
        status: [FilterOperator.EQ],
      },
      defaultSortBy: [['created_at', 'DESC']],
      nullSort: 'last',
    });
  }

  /**
   * 4. Admin Management: View single subscriber details
   * GET /newsletter/admin/subscribers/:id
   */
  async findOne(id: number): Promise<NewsletterSubscriber> {
    const subscriber = await this.subscriberRepo.findOne({
      where: { id },
    });

    if (!subscriber) {
      throw new NotFoundException(`Newsletter subscriber #${id} not found.`);
    }

    return subscriber;
  }
}
