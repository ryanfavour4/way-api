jest.mock('uuid', () => ({
  v4: () => 'mocked-uuid',
}));

import { Test, TestingModule } from '@nestjs/testing';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from 'src/auth/guard/auth.guard';
import { User, UserRole } from 'src/users/entities/users.entity';
import { Upload } from './entities/upload.entity';

describe('UploadsController - Guards & Routing', () => {
  let controller: UploadsController;
  let service: jest.Mocked<Partial<UploadsService>>;

  const mockUser: User = {
    id: 1,
    role: UserRole.USER,
  } as User;

  beforeEach(async () => {
    service = {
      uploadFile: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadsController],
      providers: [
        {
          provide: UploadsService,
          useValue: service,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UploadsController>(UploadsController);
  });

  it('should be defined and instantiate properly', () => {
    expect(controller).toBeDefined();
  });

  it('should pass authenticated user context when uploading files to record uploader', async () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test.png',
      encoding: '7bit',
      mimetype: 'image/png',
      buffer: Buffer.from('fake-image-bytes'),
      size: 16,
      destination: '',
      filename: 'test.png',
      path: '',
    };

    const expectedUpload: Upload = {
      id: 10,
      url: 'http://localhost:3300/public/uploads/user-profile/test.png',
      public_id: '/public/uploads/user-profile/test.png',
      asset_id: 'mocked-uuid',
      type: 'user-profile',
      resource_type: 'image',
      uploaded_by_user_id: mockUser.id,
    } as Upload;

    (service.uploadFile as jest.Mock).mockResolvedValue(expectedUpload);

    const result = await controller.uploadFiles([mockFile], 'user-profile', {
      user: mockUser,
    });

    expect(service.uploadFile).toHaveBeenCalledWith(
      mockFile,
      'user-profile',
      mockUser,
    );
    expect(result).toEqual([expectedUpload]);
  });

  it('should forward remove requests with authenticated user context', async () => {
    (service.remove as jest.Mock).mockResolvedValue(undefined);

    await controller.remove(50, { user: mockUser });

    expect(service.remove).toHaveBeenCalledWith(50, mockUser);
  });
});
