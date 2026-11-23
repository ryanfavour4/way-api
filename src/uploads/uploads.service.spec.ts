jest.mock('uuid', () => ({
  v4: () => 'mocked-uuid',
}));

import { Test, TestingModule } from '@nestjs/testing';
import { UploadsService } from './uploads.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Upload } from './entities/upload.entity';
import { Store } from 'src/stores/entities/store.entity';
import { User, UserRole } from 'src/users/entities/users.entity';
import { ForbiddenException, ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { LocalStorageEngine } from './local-storage.engine';

describe('UploadsService - Ownership & Deletion Security', () => {
  let service: UploadsService;
  let uploadRepo: jest.Mocked<Partial<Repository<Upload>>>;
  let storeRepo: jest.Mocked<Partial<Repository<Store>>>;
  let userRepo: jest.Mocked<Partial<Repository<User>>>;

  const mockUpload: Upload = {
    id: 50,
    url: 'http://localhost:3300/public/uploads/user-profile/test.jpg',
    public_id: '/public/uploads/user-profile/test.jpg',
    asset_id: 'asset-123',
    type: 'user-profile',
    resource_type: 'image',
    uploaded_by_user_id: 2, // Uploaded by avatarOwner (id: 2)
    created_at: new Date(),
    updated_at: new Date(),
  } as Upload;

  const unassignedUpload: Upload = {
    id: 60,
    url: 'http://localhost:3300/public/uploads/media-images/unassigned.jpg',
    public_id: '/public/uploads/media-images/unassigned.jpg',
    asset_id: 'asset-unassigned',
    type: 'media-images',
    resource_type: 'image',
    uploaded_by_user_id: 10, // Uploaded by merchantUser (id: 10)
    created_at: new Date(),
    updated_at: new Date(),
  } as Upload;

  const ordinaryUser: User = {
    id: 1,
    role: UserRole.USER,
    avatar_id: 999, // Does NOT own upload 50
  } as User;

  const avatarOwner: User = {
    id: 2,
    role: UserRole.USER,
    avatar_id: 50, // Owns upload 50
  } as User;

  const merchantUser: User = {
    id: 10,
    role: UserRole.MERCHANT,
  } as User;

  const adminUser: User = {
    id: 99,
    role: UserRole.ADMIN,
  } as User;

  beforeEach(async () => {
    uploadRepo = {
      findOneBy: jest.fn(),
      remove: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    storeRepo = {
      findOne: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    };
    userRepo = {
      count: jest.fn(),
      update: jest.fn(),
    };

    // Mock file save and deletion
    jest.spyOn(LocalStorageEngine, 'saveFile').mockResolvedValue('/public/uploads/user-profile/saved.jpg');
    jest.spyOn(LocalStorageEngine, 'deleteFile').mockResolvedValue();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsService,
        {
          provide: getRepositoryToken(Upload),
          useValue: uploadRepo,
        },
        {
          provide: getRepositoryToken(Store),
          useValue: storeRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
      ],
    }).compile();

    service = module.get<UploadsService>(UploadsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('uploadFile', () => {
    it('should record the authenticated uploader ID server-side upon upload creation', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'photo.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('image-binary'),
        size: 12,
        destination: '',
        filename: 'photo.jpg',
        path: '',
      };

      const createdEntity = {
        url: 'http://localhost:3300/public/uploads/user-profile/saved.jpg',
        public_id: '/public/uploads/user-profile/saved.jpg',
        asset_id: 'mocked-uuid',
        type: 'user-profile',
        resource_type: 'image',
        uploaded_by_user_id: avatarOwner.id,
      } as Upload;

      (uploadRepo.create as jest.Mock).mockReturnValue(createdEntity);
      (uploadRepo.save as jest.Mock).mockResolvedValue(createdEntity);

      const result = await service.uploadFile(mockFile, 'user-profile', avatarOwner);

      expect(uploadRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'user-profile',
          resource_type: 'image',
          uploaded_by_user_id: avatarOwner.id,
        }),
      );
      expect(result.uploaded_by_user_id).toBe(avatarOwner.id);
    });
  });

  describe('remove', () => {
    it('should throw ForbiddenException when an ordinary user attempts to delete an upload they did not create or reference', async () => {
      (uploadRepo.findOneBy as jest.Mock).mockResolvedValue(mockUpload);
      (storeRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.remove(50, ordinaryUser)).rejects.toThrow(
        ForbiddenException,
      );

      expect(uploadRepo.remove).not.toHaveBeenCalled();
    });

    it('should allow the original uploader to delete their solitary unassigned upload', async () => {
      (uploadRepo.findOneBy as jest.Mock).mockResolvedValue(unassignedUpload);
      (userRepo.count as jest.Mock).mockResolvedValue(0);
      (storeRepo.count as jest.Mock).mockResolvedValue(0);
      (storeRepo.update as jest.Mock).mockResolvedValue({ affected: 0 });
      (uploadRepo.remove as jest.Mock).mockResolvedValue(unassignedUpload);

      await service.remove(60, merchantUser); // merchantUser is uploader (id: 10)

      expect(uploadRepo.remove).toHaveBeenCalledWith(unassignedUpload);
    });

    it('should reject another user attempting to delete an unassigned upload uploaded by someone else', async () => {
      (uploadRepo.findOneBy as jest.Mock).mockResolvedValue(unassignedUpload); // uploaded by id: 10
      (storeRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.remove(60, ordinaryUser)).rejects.toThrow(
        ForbiddenException, // ordinaryUser is id: 1
      );

      expect(uploadRepo.remove).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if the upload is currently shared and in use by another user', async () => {
      (uploadRepo.findOneBy as jest.Mock).mockResolvedValue(mockUpload);
      (userRepo.count as jest.Mock).mockResolvedValue(1); // Another user is using it!
      (storeRepo.count as jest.Mock).mockResolvedValue(0);

      await expect(service.remove(50, avatarOwner)).rejects.toThrow(
        ConflictException,
      );

      expect(uploadRepo.remove).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if the upload is in use by another merchant store', async () => {
      (uploadRepo.findOneBy as jest.Mock).mockResolvedValue(mockUpload);
      (userRepo.count as jest.Mock).mockResolvedValue(0);
      (storeRepo.count as jest.Mock).mockResolvedValue(1); // Another store is using it!

      await expect(service.remove(50, avatarOwner)).rejects.toThrow(
        ConflictException,
      );

      expect(uploadRepo.remove).not.toHaveBeenCalled();
    });

    it('should allow user to delete their solitary avatar upload and cleanly unlink it', async () => {
      (uploadRepo.findOneBy as jest.Mock).mockResolvedValue(mockUpload);
      (userRepo.count as jest.Mock).mockResolvedValue(0); // No other users
      (storeRepo.count as jest.Mock).mockResolvedValue(0); // No other stores
      (userRepo.update as jest.Mock).mockResolvedValue({ affected: 1 });
      (storeRepo.update as jest.Mock).mockResolvedValue({ affected: 0 });
      (uploadRepo.remove as jest.Mock).mockResolvedValue(mockUpload);

      await service.remove(50, avatarOwner);

      expect(userRepo.update).toHaveBeenCalledWith(avatarOwner.id, {
        avatar_id: undefined,
      });
      expect(uploadRepo.remove).toHaveBeenCalledWith(mockUpload);
    });

    it('should allow a merchant to delete an unshared store logo and cleanly unlink it', async () => {
      (uploadRepo.findOneBy as jest.Mock).mockResolvedValue(mockUpload);
      (storeRepo.findOne as jest.Mock).mockResolvedValue({
        id: 1,
        merchant_id: 10,
        logo_id: 50,
      } as Store);
      (userRepo.count as jest.Mock).mockResolvedValue(0);
      (storeRepo.count as jest.Mock).mockResolvedValue(0);
      (storeRepo.update as jest.Mock).mockResolvedValue({ affected: 1 });
      (uploadRepo.remove as jest.Mock).mockResolvedValue(mockUpload);

      await service.remove(50, merchantUser);

      expect(storeRepo.update).toHaveBeenCalledWith(
        { merchant_id: merchantUser.id, logo_id: mockUpload.id },
        { logo_id: undefined },
      );
      expect(uploadRepo.remove).toHaveBeenCalledWith(mockUpload);
    });

    it('should allow an ADMIN to delete an unshared upload', async () => {
      (uploadRepo.findOneBy as jest.Mock).mockResolvedValue(mockUpload);
      (userRepo.count as jest.Mock).mockResolvedValue(0);
      (storeRepo.count as jest.Mock).mockResolvedValue(0);
      (storeRepo.update as jest.Mock).mockResolvedValue({ affected: 0 });
      (uploadRepo.remove as jest.Mock).mockResolvedValue(mockUpload);

      await service.remove(50, adminUser);

      expect(uploadRepo.remove).toHaveBeenCalledWith(mockUpload);
    });
  });
});
