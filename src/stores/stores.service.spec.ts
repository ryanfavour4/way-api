import { Test, TestingModule } from '@nestjs/testing';
import { StoresService } from './stores.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Store,
  StoreType,
  StoreVerificationStatus,
} from './entities/store.entity';
import { User, UserRole, UserStatus } from 'src/users/entities/users.entity';
import { Upload } from 'src/uploads/entities/upload.entity';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';

describe('StoresService - Ownership & Security', () => {
  let service: StoresService;
  let storeRepo: jest.Mocked<Partial<Repository<Store>>>;
  let uploadRepo: jest.Mocked<Partial<Repository<Upload>>>;
  let userRepo: jest.Mocked<Partial<Repository<User>>>;

  const merchantOwner: User = {
    id: 10,
    fullname: 'Store Owner',
    email: 'owner@example.com',
    role: UserRole.MERCHANT,
    status: UserStatus.ACTIVE,
  } as User;

  const otherMerchant: User = {
    id: 20,
    fullname: 'Competitor Merchant',
    email: 'competitor@example.com',
    role: UserRole.MERCHANT,
    status: UserStatus.ACTIVE,
  } as User;

  const adminUser: User = {
    id: 99,
    fullname: 'Platform Admin',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
  } as User;

  const mockStore: Store = {
    id: 100,
    merchant_id: 10,
    name: 'Original Store Name',
    slug: 'original-store-name-1234',
    contact_email: 'store@example.com',
    primary_phone: '+2348011112222',
    address_line: '123 Main St',
    city: 'Lagos',
    state: 'Lagos',
    country: 'Nigeria',
    latitude: 6.5244,
    longitude: 3.3792,
    store_type: StoreType.RETAIL,
    primary_category_id: 1,
    verification_status: StoreVerificationStatus.PENDING,
    has_verified_badge: false,
    rating_avg: 0,
    review_count: 0,
    footfall_count: 0,
    is_active: true,
    is_open_override: true,
    logo_id: undefined,
    storefront_image_id: undefined,
  } as Store;

  beforeEach(async () => {
    storeRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
      create: jest.fn(),
    };
    uploadRepo = {
      findOne: jest.fn(),
    };
    userRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoresService,
        {
          provide: getRepositoryToken(Store),
          useValue: storeRepo,
        },
        {
          provide: getRepositoryToken(Upload),
          useValue: uploadRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
      ],
    }).compile();

    service = module.get<StoresService>(StoresService);
  });

  describe('create', () => {
    it('should allow merchant to create a store with their own upload as logo', async () => {
      (uploadRepo.findOne as jest.Mock).mockResolvedValue({
        id: 50,
        resource_type: 'image',
        uploaded_by_user_id: merchantOwner.id, // Uploaded by merchantOwner!
      } as Upload);

      (userRepo.findOne as jest.Mock).mockResolvedValue(null);
      (storeRepo.findOne as jest.Mock).mockResolvedValue(null);
      (storeRepo.create as jest.Mock).mockImplementation((dto) => ({
        ...dto,
        id: 101,
      }));
      (storeRepo.save as jest.Mock).mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await service.create(merchantOwner, {
        name: 'My New Store',
        contact_email: 'new@store.com',
        primary_phone: '+234800000000',
        address_line: 'Line 1',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        latitude: 6.5,
        longitude: 3.3,
        store_type: StoreType.RETAIL,
        primary_category_id: 1,
        logo_id: 50,
      });

      expect(result.merchant_id).toBe(merchantOwner.id);
      expect(result.logo_id).toBe(50);
    });

    it('should throw ForbiddenException if merchant attempts to create store with another user upload', async () => {
      (uploadRepo.findOne as jest.Mock).mockResolvedValue({
        id: 60,
        resource_type: 'image',
        uploaded_by_user_id: 999, // Uploaded by someone else!
      } as Upload);

      (userRepo.findOne as jest.Mock).mockResolvedValue(null);
      (storeRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create(merchantOwner, {
          name: 'My New Store',
          contact_email: 'new@store.com',
          primary_phone: '+234800000000',
          address_line: 'Line 1',
          city: 'Lagos',
          state: 'Lagos',
          country: 'Nigeria',
          latitude: 6.5,
          longitude: 3.3,
          store_type: StoreType.RETAIL,
          primary_category_id: 1,
          logo_id: 60,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should throw ForbiddenException when a merchant attempts to update another merchant store', async () => {
      (storeRepo.findOne as jest.Mock).mockResolvedValue({ ...mockStore });

      await expect(
        service.update(100, otherMerchant, { name: 'Hijacked Store' }),
      ).rejects.toThrow(ForbiddenException);

      expect(storeRepo.save).not.toHaveBeenCalled();
    });

    it('should allow the owning merchant to update their store and strip admin fields', async () => {
      (storeRepo.findOne as jest.Mock).mockResolvedValue({ ...mockStore });
      (storeRepo.save as jest.Mock).mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await service.update(100, merchantOwner, {
        name: 'New Valid Name',
        description: 'Updated Description',
        ...({
          verification_status: StoreVerificationStatus.VERIFIED,
          has_verified_badge: true,
          merchant_id: 999,
        } as any),
      });

      expect(result.name).toBe('New Valid Name');
      expect(result.description).toBe('Updated Description');
      expect(result.verification_status).toBe(StoreVerificationStatus.PENDING);
      expect(result.has_verified_badge).toBe(false);
      expect(result.merchant_id).toBe(10);
    });

    it('should throw ForbiddenException when Merchant A attempts to assign Merchant B unassigned upload', async () => {
      (storeRepo.findOne as jest.Mock).mockResolvedValue({ ...mockStore }); // merchantOwner (id: 10)
      (uploadRepo.findOne as jest.Mock).mockResolvedValue({
        id: 70,
        resource_type: 'image',
        uploaded_by_user_id: 20, // Uploaded by otherMerchant (id: 20)!
      } as Upload);
      (userRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update(100, merchantOwner, { logo_id: 70 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if store logo upload ID does not exist', async () => {
      (storeRepo.findOne as jest.Mock).mockResolvedValue({ ...mockStore });
      (uploadRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update(100, merchantOwner, { logo_id: 99999 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if store logo upload is not an image', async () => {
      (storeRepo.findOne as jest.Mock).mockResolvedValue({ ...mockStore });
      (uploadRepo.findOne as jest.Mock).mockResolvedValue({
        id: 80,
        resource_type: 'video',
        uploaded_by_user_id: merchantOwner.id,
      } as Upload);

      await expect(
        service.update(100, merchantOwner, { logo_id: 80 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow the owning merchant to assign their own unassigned upload as store logo', async () => {
      (storeRepo.findOne as jest.Mock).mockResolvedValue({ ...mockStore });
      (uploadRepo.findOne as jest.Mock).mockResolvedValue({
        id: 88,
        resource_type: 'image',
        uploaded_by_user_id: merchantOwner.id, // Own upload!
      } as Upload);
      (userRepo.findOne as jest.Mock).mockResolvedValue(null);
      (storeRepo.save as jest.Mock).mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await service.update(100, merchantOwner, { logo_id: 88 });
      expect(result.logo_id).toBe(88);
    });

    it('should allow an ADMIN to assign any upload to any store', async () => {
      (storeRepo.findOne as jest.Mock).mockResolvedValue({ ...mockStore });
      (uploadRepo.findOne as jest.Mock).mockResolvedValue({
        id: 90,
        resource_type: 'image',
        uploaded_by_user_id: 20, // Uploaded by someone else
      } as Upload);
      (storeRepo.save as jest.Mock).mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await service.update(100, adminUser, {
        name: 'Admin Updated Store',
        logo_id: 90,
      });

      expect(result.name).toBe('Admin Updated Store');
      expect(result.logo_id).toBe(90);
    });
  });

  describe('remove', () => {
    it('should throw ForbiddenException when a merchant attempts to delete another merchant store', async () => {
      (storeRepo.findOne as jest.Mock).mockResolvedValue({ ...mockStore });

      await expect(service.remove(100, otherMerchant)).rejects.toThrow(
        ForbiddenException,
      );

      expect(storeRepo.softDelete).not.toHaveBeenCalled();
    });

    it('should allow the owning merchant to soft delete their own store', async () => {
      (storeRepo.findOne as jest.Mock).mockResolvedValue({ ...mockStore });
      (storeRepo.softDelete as jest.Mock).mockResolvedValue({ affected: 1 });

      const result = await service.remove(100, merchantOwner);
      expect(result).toEqual({
        message: 'Store 100 has been soft deleted successfully',
      });
      expect(storeRepo.softDelete).toHaveBeenCalledWith(100);
    });

    it('should allow an ADMIN to soft delete any store', async () => {
      (storeRepo.findOne as jest.Mock).mockResolvedValue({ ...mockStore });
      (storeRepo.softDelete as jest.Mock).mockResolvedValue({ affected: 1 });

      const result = await service.remove(100, adminUser);
      expect(result).toEqual({
        message: 'Store 100 has been soft deleted successfully',
      });
      expect(storeRepo.softDelete).toHaveBeenCalledWith(100);
    });
  });
});
