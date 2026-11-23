import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from 'src/auth/guard/auth.guard';
import { RolesGuard } from 'src/auth/guard/roles.guard';
import { ROLES_KEY } from 'src/auth/decorator/roles.decorator';
import { UserRole } from 'src/users/entities/users.entity';
import { Reflector } from '@nestjs/core';

describe('CategoriesController - Guards & Permissions', () => {
  let controller: CategoriesController;
  let service: jest.Mocked<Partial<CategoriesService>>;
  const reflector = new Reflector();

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: service,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CategoriesController>(CategoriesController);
  });

  it('should have ADMIN and ADMIN_STAFF roles on create', () => {
    const roles = reflector.get<UserRole[]>(ROLES_KEY, controller.create);
    expect(roles).toEqual([UserRole.ADMIN, UserRole.ADMIN_STAFF]);
  });

  it('should have ADMIN and ADMIN_STAFF roles on update', () => {
    const roles = reflector.get<UserRole[]>(ROLES_KEY, controller.update);
    expect(roles).toEqual([UserRole.ADMIN, UserRole.ADMIN_STAFF]);
  });

  it('should have ADMIN and ADMIN_STAFF roles on remove', () => {
    const roles = reflector.get<UserRole[]>(ROLES_KEY, controller.remove);
    expect(roles).toEqual([UserRole.ADMIN, UserRole.ADMIN_STAFF]);
  });

  it('should not have roles restriction on findAll (public endpoint)', () => {
    const roles = reflector.get<UserRole[]>(ROLES_KEY, controller.findAll);
    expect(roles).toBeUndefined();
  });

  it('should not have roles restriction on findOne (public endpoint)', () => {
    const roles = reflector.get<UserRole[]>(ROLES_KEY, controller.findOne);
    expect(roles).toBeUndefined();
  });
});
