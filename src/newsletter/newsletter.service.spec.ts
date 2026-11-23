import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NewsletterService } from './newsletter.service';
import {
  NewsletterSubscriber,
  NewsletterSubscriberStatus,
} from './entities/newsletter-subscriber.entity';
import { paginate } from 'nestjs-paginate';

jest.mock('nestjs-paginate', () => ({
  ...jest.requireActual('nestjs-paginate'),
  paginate: jest.fn(),
}));

describe('NewsletterService', () => {
  let service: NewsletterService;
  let repo: jest.Mocked<Partial<Repository<NewsletterSubscriber>>>;

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsletterService,
        {
          provide: getRepositoryToken(NewsletterSubscriber),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get<NewsletterService>(NewsletterService);
  });

  describe('Subscription (POST /newsletter/subscribe)', () => {
    it('should throw BadRequestException if consent is missing or false', async () => {
      await expect(
        service.subscribe({ email: 'john@gmail.com', consent: false }),
      ).rejects.toThrow(BadRequestException);

      // @ts-expect-error test invalid consent type
      await expect(
        service.subscribe({ email: 'john@gmail.com', consent: null }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if email is invalid format', async () => {
      await expect(
        service.subscribe({ email: 'not-an-email', consent: true }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.subscribe({ email: '', consent: true }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should normalize email to lowercase and trim whitespace', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);
      (repo.create as jest.Mock).mockImplementation((data) => data);
      (repo.save as jest.Mock).mockImplementation(async (sub) => ({ id: 1, ...sub }));

      await service.subscribe({
        email: '   JOHN@GMAIL.COM   ',
        consent: true,
      });

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { email: 'john@gmail.com' },
      });
      expect(repo.create).toHaveBeenCalledWith({
        email: 'john@gmail.com',
        status: NewsletterSubscriberStatus.SUBSCRIBED,
      });
    });

    it('should successfully subscribe a new email address', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);
      const createdEntity = {
        id: 1,
        email: 'john@gmail.com',
        status: NewsletterSubscriberStatus.SUBSCRIBED,
        created_at: new Date(),
        updated_at: new Date(),
      };
      (repo.create as jest.Mock).mockReturnValue(createdEntity);
      (repo.save as jest.Mock).mockResolvedValue(createdEntity);

      const result = await service.subscribe({
        email: 'john@gmail.com',
        consent: true,
      });

      expect(result.status).toBe(NewsletterSubscriberStatus.SUBSCRIBED);
      expect(result.message).toContain('Successfully subscribed');
      expect(repo.save).toHaveBeenCalled();
    });

    it('should gracefully handle duplicate subscription without creating duplicate records', async () => {
      const existingSubscriber = {
        id: 1,
        email: 'john@gmail.com',
        status: NewsletterSubscriberStatus.SUBSCRIBED,
      } as NewsletterSubscriber;

      (repo.findOne as jest.Mock).mockResolvedValue(existingSubscriber);

      const result = await service.subscribe({
        email: 'john@gmail.com',
        consent: true,
      });

      expect(result.status).toBe(NewsletterSubscriberStatus.SUBSCRIBED);
      expect(result.message).toContain('already subscribed');
      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('should reactivate and resubscribe a previously unsubscribed user', async () => {
      const unsubscribedUser = {
        id: 2,
        email: 'john@gmail.com',
        status: NewsletterSubscriberStatus.UNSUBSCRIBED,
      } as NewsletterSubscriber;

      (repo.findOne as jest.Mock).mockResolvedValue(unsubscribedUser);
      (repo.save as jest.Mock).mockImplementation(async (sub) => sub);

      const result = await service.subscribe({
        email: 'john@gmail.com',
        consent: true,
      });

      expect(result.status).toBe(NewsletterSubscriberStatus.SUBSCRIBED);
      expect(result.message).toContain('Successfully resubscribed');
      expect(unsubscribedUser.status).toBe(NewsletterSubscriberStatus.SUBSCRIBED);
      expect(repo.save).toHaveBeenCalledWith(unsubscribedUser);
    });
  });

  describe('Unsubscription (POST /newsletter/unsubscribe)', () => {
    it('should successfully unsubscribe using a valid email address', async () => {
      const subscriber = {
        id: 5,
        email: 'john@gmail.com',
        status: NewsletterSubscriberStatus.SUBSCRIBED,
      } as NewsletterSubscriber;

      (repo.findOne as jest.Mock).mockResolvedValue(subscriber);
      (repo.save as jest.Mock).mockImplementation(async (s) => s);

      const result = await service.unsubscribe({ email: '   JOHN@GMAIL.COM   ' });

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { email: 'john@gmail.com' },
      });
      expect(result.status).toBe(NewsletterSubscriberStatus.UNSUBSCRIBED);
      expect(result.message).toContain('Successfully unsubscribed');
      expect(subscriber.status).toBe(NewsletterSubscriberStatus.UNSUBSCRIBED);
      expect(repo.save).toHaveBeenCalledWith(subscriber);
    });

    it('should throw BadRequestException if email is invalid format during unsubscription', async () => {
      await expect(
        service.unsubscribe({ email: 'not-an-email' }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.unsubscribe({ email: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if email does not exist during unsubscription', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.unsubscribe({ email: 'unknown@example.com' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle already-unsubscribed email gracefully without saving again', async () => {
      const subscriber = {
        id: 6,
        email: 'john@gmail.com',
        status: NewsletterSubscriberStatus.UNSUBSCRIBED,
      } as NewsletterSubscriber;

      (repo.findOne as jest.Mock).mockResolvedValue(subscriber);

      const result = await service.unsubscribe({ email: 'john@gmail.com' });

      expect(result.status).toBe(NewsletterSubscriberStatus.UNSUBSCRIBED);
      expect(result.message).toContain('already unsubscribed');
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('Admin Subscriber Retrieval', () => {
    it('should return paginated subscribers from findAll', async () => {
      const mockQueryBuilder = {
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
      };
      (repo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      const mockPaginated = {
        data: [{ id: 1, email: 'sub@example.com', status: NewsletterSubscriberStatus.SUBSCRIBED }],
        meta: { itemsPerPage: 10, totalItems: 1, currentPage: 1, totalPages: 1 },
      };

      (paginate as jest.Mock).mockResolvedValue(mockPaginated);

      const result = await service.findAll({ path: 'newsletter/admin/subscribers' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].email).toBe('sub@example.com');
    });

    it('should return subscriber by id in findOne', async () => {
      const subscriber = {
        id: 1,
        email: 'admin-view@example.com',
        status: NewsletterSubscriberStatus.SUBSCRIBED,
      } as NewsletterSubscriber;

      (repo.findOne as jest.Mock).mockResolvedValue(subscriber);

      const result = await service.findOne(1);
      expect(result.id).toBe(1);
      expect(result.email).toBe('admin-view@example.com');
    });

    it('should throw NotFoundException in findOne if subscriber does not exist', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });
});
