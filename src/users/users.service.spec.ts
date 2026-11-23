import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole, UserStatus } from './entities/users.entity';
import { Upload } from 'src/uploads/entities/upload.entity';
import { Store } from 'src/stores/entities/store.entity';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';

describe('UsersService - Security & Ownership', () => {
  let service: UsersService;
  let userRepo: jest.Mocked<Partial<Repository<User>>>;
  let uploadRepo: jest.Mocked<Partial<Repository<Upload>>>;
  let storeRepo: jest.Mocked<Partial<Repository<Store>>>;

  const mockUser: User = {
    id: 1,
    fullname: 'John Doe',
    email: 'john@example.com',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    email_verified: false,
    phone_verified: false,
    avatar_id: undefined,
    created_at: new Date(),
    updated_at: new Date(),
  } as User;

  const otherUser: User = {
    id: 2,
    fullname: 'Jane Doe',
    email: 'jane@example.com',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    email_verified: false,
    phone_verified: false,
    avatar_id: 200,
    created_at: new Date(),
    updated_at: new Date(),
  } as User;

  const adminUser: User = {
    id: 99,
    fullname: 'Admin User',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    email_verified: true,
    phone_verified: true,
    created_at: new Date(),
    updated_at: new Date(),
  } as User;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
    };
    uploadRepo = {
      findOne: jest.fn(),
    };
    storeRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: getRepositoryToken(Upload),
          useValue: uploadRepo,
        },
        {
          provide: getRepositoryToken(Store),
          useValue: storeRepo,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('update', () => {
    it('should reject when an ordinary user attempts to update another user account', async () => {
      await expect(
        service.update(2, mockUser, { fullname: 'Hacked Name' }),
      ).rejects.toThrow(ForbiddenException);
      expect(userRepo.findOne).not.toHaveBeenCalled();
    });

    it('should allow an ordinary user to update their own account and only update permitted fields', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue({ ...mockUser });
      (userRepo.save as jest.Mock).mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await service.update(1, mockUser, {
        fullname: 'Updated Name',
        bio: 'New Bio',
        // Attempting to pass sensitive fields that should be stripped
        ...({ role: UserRole.ADMIN, status: UserStatus.SUSPENDED } as any),
      });

      expect(result.fullname).toBe('Updated Name');
      expect(result.bio).toBe('New Bio');
      expect(result.role).toBe(UserRole.USER); // Role must NOT change
      expect(result.status).toBe(UserStatus.ACTIVE); // Status must NOT change
    });

    it('should allow an ADMIN to update any user profile', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue({ ...otherUser });
      (userRepo.save as jest.Mock).mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await service.update(2, adminUser, {
        fullname: 'Admin Changed Name',
      });

      expect(result.fullname).toBe('Admin Changed Name');
    });

    it('should throw BadRequestException if avatar_id does not exist', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue({ ...mockUser });
      (uploadRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update(1, mockUser, { avatar_id: 999 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if avatar upload is not an image', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue({ ...mockUser });
      (uploadRepo.findOne as jest.Mock).mockResolvedValue({
        id: 101,
        resource_type: 'video',
      } as Upload);

      await expect(
        service.update(1, mockUser, { avatar_id: 101 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if avatar is already assigned to another user', async () => {
      (userRepo.findOne as jest.Mock)
        .mockResolvedValueOnce({ ...mockUser }) // find target user (id: 1)
        .mockResolvedValueOnce({ ...otherUser }); // other user with avatar_id: 200 (id: 2)

      (uploadRepo.findOne as jest.Mock).mockResolvedValue({
        id: 200,
        resource_type: 'image',
        uploaded_by_user_id: 1,
      } as Upload);

      await expect(
        service.update(1, mockUser, { avatar_id: 200 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if avatar upload belongs to another merchant store', async () => {
      (userRepo.findOne as jest.Mock)
        .mockResolvedValueOnce({ ...mockUser }) // find target user
        .mockResolvedValueOnce(null); // no other user using it

      (uploadRepo.findOne as jest.Mock).mockResolvedValue({
        id: 300,
        resource_type: 'image',
        uploaded_by_user_id: 1,
      } as Upload);

      (storeRepo.findOne as jest.Mock).mockResolvedValue({
        id: 5,
        merchant_id: 88, // Different merchant!
        logo_id: 300,
      } as Store);

      await expect(
        service.update(1, mockUser, { avatar_id: 300 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when a user attempts to claim an unassigned upload uploaded by someone else', async () => {
      (userRepo.findOne as jest.Mock)
        .mockResolvedValueOnce({ ...mockUser }) // target user (id: 1)
        .mockResolvedValueOnce(null); // no other user using it

      (uploadRepo.findOne as jest.Mock).mockResolvedValue({
        id: 450,
        resource_type: 'image',
        uploaded_by_user_id: 2, // Uploaded by otherUser (id: 2)!
      } as Upload);

      (storeRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update(1, mockUser, { avatar_id: 450 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when a user attempts to claim an unassigned upload with unverified ownership (NULL)', async () => {
      (userRepo.findOne as jest.Mock)
        .mockResolvedValueOnce({ ...mockUser }) // target user (id: 1, avatar_id: undefined)
        .mockResolvedValueOnce(null);

      (uploadRepo.findOne as jest.Mock).mockResolvedValue({
        id: 460,
        resource_type: 'image',
        uploaded_by_user_id: null, // Legacy unassigned record without established uploader
      } as unknown as Upload);

      (storeRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update(1, mockUser, { avatar_id: 460 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow an uploader to assign their own unassigned image as their avatar', async () => {
      (userRepo.findOne as jest.Mock)
        .mockResolvedValueOnce({ ...mockUser }) // target user
        .mockResolvedValueOnce(null); // not used by other user

      (uploadRepo.findOne as jest.Mock).mockResolvedValue({
        id: 400,
        resource_type: 'image',
        uploaded_by_user_id: mockUser.id, // Uploaded by currentUser!
      } as Upload);

      (storeRepo.findOne as jest.Mock).mockResolvedValue(null); // not used by other store

      (userRepo.save as jest.Mock).mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await service.update(1, mockUser, { avatar_id: 400 });
      expect(result.avatar_id).toBe(400);
    });

    it('should allow an administrator to assign any valid upload as a user avatar', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue({ ...mockUser });

      (uploadRepo.findOne as jest.Mock).mockResolvedValue({
        id: 500,
        resource_type: 'image',
        uploaded_by_user_id: 2, // Uploaded by another user
      } as Upload);

      (userRepo.save as jest.Mock).mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await service.update(1, adminUser, { avatar_id: 500 });
      expect(result.avatar_id).toBe(500);
    });
  });

  describe('remove', () => {
    it('should reject when an ordinary user attempts to delete another user account', async () => {
      await expect(service.remove(2, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(userRepo.softDelete).not.toHaveBeenCalled();
    });

    it('should allow an ordinary user to delete their own account using softDelete', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue({ ...mockUser });
      (userRepo.softDelete as jest.Mock).mockResolvedValue({ affected: 1 });

      const result = await service.remove(1, mockUser);
      expect(result).toEqual({ message: 'User #1 successfully removed' });
      expect(userRepo.softDelete).toHaveBeenCalledWith(1);
    });

    it('should allow an ADMIN to delete any user account using softDelete', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue({ ...otherUser });
      (userRepo.softDelete as jest.Mock).mockResolvedValue({ affected: 1 });

      const result = await service.remove(2, adminUser);
      expect(result).toEqual({ message: 'User #2 successfully removed' });
      expect(userRepo.softDelete).toHaveBeenCalledWith(2);
    });
  });
});
