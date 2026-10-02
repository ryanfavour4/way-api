import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Upload } from './entities/upload.entity';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';
import { v4 as uuidv4 } from 'uuid'; // pnpm add uuid
import 'src/types/express';

@Injectable()
export class UploadsService {
  constructor(
    @InjectRepository(Upload)
    private readonly uploadRepo: Repository<Upload>,
  ) {}

  async uploadFile(file: Express.Multer.File, type: string): Promise<Upload> {
    const assetId = uuidv4();
    // choose public id for clarity
    const publicId = `${type}-${assetId}`;

    // 1. First, just handle the Cloudinary upload in the promise
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `fundraise/${type}`,
          resource_type: 'auto',
          public_id: publicId,
        },
        // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
        (error: Error | undefined, result: UploadApiResponse | undefined) => {
          if (error || !result)
            return reject(new Error(error?.message || 'Upload failed'));
          resolve(result);
        },
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });

    // 2. Now that the promise is done, handle the DB save OUTSIDE the callback
    try {
      const newUpload = this.uploadRepo.create({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        url: result.secure_url,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        public_id: result.public_id,
        asset_id: assetId,
        type: type,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        resource_type: result.resource_type,
      });

      return await this.uploadRepo.save(newUpload);
    } catch (dbError) {
      console.log(dbError);
      throw new InternalServerErrorException(
        'Failed to save upload metadata to database',
      );
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

  // 5. Delete an upload from DB and Cloudinary
  async remove(id: number): Promise<void> {
    const upload = await this.findOne(id);

    try {
      // 1. Delete from Cloudinary first
      // Note: destroy() needs the publicId, which you've luckily saved in your DB!
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const cloudinaryResponse = await cloudinary.uploader.destroy(
        upload.public_id,
      );

      if (
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        cloudinaryResponse.result !== 'ok' &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        cloudinaryResponse.result !== 'not_found'
      ) {
        throw new Error(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          `Cloudinary deletion failed: ${cloudinaryResponse.result}`,
        );
      }

      // 2. Now delete from your Database
      await this.uploadRepo.remove(upload);
    } catch (error) {
      console.error('Delete Error:', error);
      throw new InternalServerErrorException(
        `Failed to delete asset: ${(error as Error).message}`,
      );
    }
  }
}
