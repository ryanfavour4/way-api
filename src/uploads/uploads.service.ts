import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Upload } from './entities/upload.entity';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { LocalStorageEngine } from './local-storage.engine';
import { SERVER_BASEURL } from 'src/env';

@Injectable()
export class UploadsService {
  constructor(
    @InjectRepository(Upload)
    private readonly uploadRepo: Repository<Upload>,
  ) {}
  private readonly logger = new Logger(UploadsService.name);

  async uploadFile(file: Express.Multer.File, type: string): Promise<Upload> {
    const assetId = uuidv4();

    // Extract file extension (.jpg, .mp4, etc) safely
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        resource_type: file.mimetype.split('/')[0], // dynamically tags 'image' or 'video'
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
      return await this.uploadFile(file, type);
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

  // 5. Delete an upload from DB and Local Disk
  async remove(id: number): Promise<void> {
    const upload = await this.findOne(id);

    try {
      // 1. Delete from your local file system using the saved path
      await LocalStorageEngine.deleteFile(upload.public_id);

      // 2. Now delete metadata row from database
      await this.uploadRepo.remove(upload);
    } catch (error) {
      console.error('Delete Error:', error);
      throw new InternalServerErrorException(
        `Failed to delete asset: ${(error as Error).message}`,
      );
    }
  }
}
