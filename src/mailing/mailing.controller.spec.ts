import { Test, TestingModule } from '@nestjs/testing';
import { MailingController } from './mailing.controller';
import { MailingService } from './mailing.service';
import { JwtAuthGuard } from 'src/auth/guard/auth.guard';
import { RolesGuard } from 'src/auth/guard/roles.guard';
import { ROLES_KEY } from 'src/auth/decorator/roles.decorator';
import { UserRole } from 'src/users/entities/users.entity';
import { Reflector } from '@nestjs/core';

describe('MailingController - Guards & Permissions', () => {
  let controller: MailingController;
  let service: jest.Mocked<Partial<MailingService>>;
  const reflector = new Reflector();

  beforeEach(async () => {
    service = {
      sendGenericEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MailingController],
      providers: [
        {
          provide: MailingService,
          useValue: service,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MailingController>(MailingController);
  });

  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  it('should restrict sendManual to ADMIN and ADMIN_STAFF roles', () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const roles = reflector.get<UserRole[]>(ROLES_KEY, controller.sendManual);
    expect(roles).toEqual([UserRole.ADMIN, UserRole.ADMIN_STAFF]);
  });
});
