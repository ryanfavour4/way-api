import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Upload } from './entities/upload.entity';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { LocalStorageEngine } from './local-storage.engine';
import { SERVER_BASEURL } from 'src/env';
import { User, UserRole } from 'src/users/entities/users.entity';
import { Store } from 'src/stores/entities/store.entity';

@Injectable()
export class UploadsService {
  constructor(
    @InjectRepository(Upload)
    private readonly uploadRepo: Repository<Upload>,
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}
  private readonly logger = new Logger(UploadsService.name);

  async uploadFile(
    file: Express.Multer.File,
    type: string,
    currentUser?: User | null,
  ): Promise<Upload> {
    const assetId = uuidv4();

    // Extract file extension (.jpg, .mp4, etc) safely
    const fileExt = path.extname(file.originalname) || '';
    const uniqueFilename = `${type}-${assetId}${fileExt}`;

    // 1. Send it off to Mars (our local storage helper)
    const relativeUrl = await LocalStorageEngine.saveFile(
      file,
      type,
      uniqueFilename,
    );

    // 2. Map metadata to your existing DB structure seamlessly
    try {
      const newUpload = this.uploadRepo.create({
        url: `${SERVER_BASEURL}${relativeUrl}`, // Saved as: /uploads/video/video-abc.mp4
        public_id: relativeUrl, // We map the path here so delete knows where to look
        asset_id: assetId,
        type: type,
        resource_type: file.mimetype.split('/')[0], // dynamically tags 'image' or 'video'
        uploaded_by_user_id: currentUser?.id,
      });

      return await this.uploadRepo.save(newUpload);
    } catch (dbError) {
      console.error(dbError);
      throw new InternalServerErrorException(
        'Failed to save upload metadata to database',
      );
    }
  }

  // 👇 ADDED: The new reusable URL upload handler
  async uploadFileFromUrl(
    imageUrl: string,
    type: string,
    identifier: string = 'url-upload',
    currentUser?: User | null,
  ): Promise<Upload | null> {
    try {
      // 1. Download the file
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch image from URL: ${response.statusText}`,
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 2. Extract mimetype and extension dynamically
      const mimeType = response.headers.get('content-type') || 'image/jpeg';
      const extension = mimeType.split('/')[1] || 'jpg';
      const filename = `${identifier}.${extension}`;

      // 3. Mock the Express.Multer.File object
      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname: filename,
        encoding: '7bit',
        mimetype: mimeType,
        buffer: buffer,
        size: buffer.length,
        destination: '',
        filename: filename,
        path: '',
      };

      // 4. Funnel it right back into your existing local storage flow!
      return await this.uploadFile(file, type, currentUser);
    } catch (error) {
      this.logger.error(`Failed to upload file from URL (${imageUrl}):`, error);
      // We return null so a failed avatar download doesn't break a critical flow (like Login)
      return null;
    }
  }

  async findAll(): Promise<Upload[]> {
    return await this.uploadRepo.find({
      order: { created_at: 'DESC' }, // Show newest uploads first
    });
  }

  async findOne(id: number): Promise<Upload> {
    const upload = await this.uploadRepo.findOneBy({ id });
    if (!upload) {
      throw new BadRequestException(`Upload with ID ${id} not found`);
    }
    return upload;
  }

  // 5. Delete an upload from DB and Local Disk with ownership and shared-reference protection
  async remove(id: number, currentUser: User): Promise<void> {
    const upload = await this.findOne(id);

    // 1. Authorization check: if not ADMIN, caller must be uploader or own a resource referencing this upload
    if (currentUser.role !== UserRole.ADMIN) {
      const isUploader =
        upload.uploaded_by_user_id !== undefined &&
        upload.uploaded_by_user_id !== null &&
        upload.uploaded_by_user_id === currentUser.id;

      const isUserAvatar = currentUser.avatar_id === upload.id;

      const isStoreAsset = await this.storeRepo.findOne({
        where: [
          { merchant_id: currentUser.id, logo_id: upload.id },
          { merchant_id: currentUser.id, storefront_image_id: upload.id },
        ],
      });

      if (!isUploader && !isUserAvatar && !isStoreAsset) {
        throw new ForbiddenException(
          'You do not have permission to delete this upload',
        );
      }
    }

    // 2. Shared Upload Protection:
    // Check if other users are referencing this upload as an avatar
    const otherUsersCount = await this.userRepo.count({
      where: {
        avatar_id: upload.id,
        id: Not(currentUser.id),
      },
    });

    // Check if other stores (not owned by currentUser) are referencing this upload
    const otherStoresCount = await this.storeRepo.count({
      where: [
        { logo_id: upload.id, merchant_id: Not(currentUser.id) },
        { storefront_image_id: upload.id, merchant_id: Not(currentUser.id) },
      ],
    });

    if (otherUsersCount > 0 || otherStoresCount > 0) {
      throw new ConflictException(
        `Cannot delete upload: this asset is currently in use by ${otherUsersCount} other user(s) and ${otherStoresCount} other store(s). Reassign or remove references before deleting.`,
      );
    }

    // 3. Clean up current user's own reference to avoid dangling pointers
    if (currentUser.avatar_id === upload.id) {
      await this.userRepo.update(currentUser.id, { avatar_id: undefined });
    }

    await this.storeRepo.update(
      { merchant_id: currentUser.id, logo_id: upload.id },
      { logo_id: undefined },
    );
    await this.storeRepo.update(
      { merchant_id: currentUser.id, storefront_image_id: upload.id },
      { storefront_image_id: undefined },
    );

    // 4. Physical file and database record deletion
    try {
      await LocalStorageEngine.deleteFile(upload.public_id);
      await this.uploadRepo.remove(upload);
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      console.error('Delete Error:', error);
      throw new InternalServerErrorException(
        `Failed to delete asset: ${(error as Error).message}`,
      );
    }
  }
}
