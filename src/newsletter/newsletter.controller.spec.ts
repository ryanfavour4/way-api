import { Test, TestingModule } from '@nestjs/testing';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';
import { NewsletterSubscriberStatus } from './entities/newsletter-subscriber.entity';
import { JwtAuthGuard } from 'src/auth/guard/auth.guard';
import { RolesGuard } from 'src/auth/guard/roles.guard';
import { ROLES_KEY } from 'src/auth/decorator/roles.decorator';
import { UserRole } from 'src/users/entities/users.entity';

describe('NewsletterController', () => {
  let controller: NewsletterController;
  let service: jest.Mocked<Partial<NewsletterService>>;

  beforeEach(async () => {
    service = {
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NewsletterController],
      providers: [
        {
          provide: NewsletterService,
          useValue: service,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NewsletterController>(NewsletterController);
  });

  describe('Public Endpoints', () => {
    it('POST /newsletter/subscribe should delegate to service.subscribe', async () => {
      const dto = { email: 'john@gmail.com', consent: true };
      const expectedResponse = {
        message: 'Successfully subscribed to the newsletter.',
        status: NewsletterSubscriberStatus.SUBSCRIBED,
      };
      (service.subscribe as jest.Mock).mockResolvedValue(expectedResponse);

      const result = await controller.subscribe(dto);
      expect(result).toEqual(expectedResponse);
      expect(service.subscribe).toHaveBeenCalledWith(dto);
    });

    it('POST /newsletter/unsubscribe should delegate to service.unsubscribe with email body', async () => {
      const dto = { email: 'john@gmail.com' };
      const expectedResponse = {
        message: 'Successfully unsubscribed from the newsletter.',
        status: NewsletterSubscriberStatus.UNSUBSCRIBED,
      };
      (service.unsubscribe as jest.Mock).mockResolvedValue(expectedResponse);

      const result = await controller.unsubscribe(dto);
      expect(result).toEqual(expectedResponse);
      expect(service.unsubscribe).toHaveBeenCalledWith(dto);
    });
  });

  describe('Admin Endpoints & Role Metadata', () => {
    it('GET /newsletter/admin/subscribers should have JwtAuthGuard, RolesGuard and ADMIN/ADMIN_STAFF roles', () => {
      const guards = Reflect.getMetadata('__guards__', controller.findAll);
      expect(guards).toBeDefined();
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(RolesGuard);

      const roles = Reflect.getMetadata(ROLES_KEY, controller.findAll);
      expect(roles).toEqual([UserRole.ADMIN, UserRole.ADMIN_STAFF]);
    });

    it('GET /newsletter/admin/subscribers/:id should have JwtAuthGuard, RolesGuard and ADMIN/ADMIN_STAFF roles', () => {
      const guards = Reflect.getMetadata('__guards__', controller.findOne);
      expect(guards).toBeDefined();
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(RolesGuard);

      const roles = Reflect.getMetadata(ROLES_KEY, controller.findOne);
      expect(roles).toEqual([UserRole.ADMIN, UserRole.ADMIN_STAFF]);
    });

    it('GET /newsletter/admin/subscribers should delegate to service.findAll', async () => {
      const query = { path: 'newsletter/admin/subscribers' };
      const expectedResponse = { data: [], meta: {} };
      (service.findAll as jest.Mock).mockResolvedValue(expectedResponse as any);

      const result = await controller.findAll(query as any);
      expect(result).toEqual(expectedResponse);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('GET /newsletter/admin/subscribers/:id should delegate to service.findOne', async () => {
      const expectedResponse = { id: 1, email: 'sub@example.com', status: NewsletterSubscriberStatus.SUBSCRIBED };
      (service.findOne as jest.Mock).mockResolvedValue(expectedResponse as any);

      const result = await controller.findOne(1);
      expect(result).toEqual(expectedResponse);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });
});
