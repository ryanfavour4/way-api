import { InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export type AllowedPathEnum =
  | 'media-images'
  | 'media-videos'
  | 'event-images'
  | 'event-videos'
  | 'user-profile'
  | 'user-wallphoto'
  | 'general';

export const allowedPaths = [
  'media-images',
  'media-videos',
  'event-images',
  'event-videos',
  'user-profile',
  'user-wallphoto',
  'general',
];

export class LocalStorageEngine {
  // Always resolves to a folder named "uploads" at your absolute project root
  private static readonly baseUploadDir = path.resolve(
    process.cwd(),
    'public/uploads',
  );

  static async saveFile(
    file: Express.Multer.File,
    type: string,
    filename: string,
  ): Promise<string> {
    const targetDir = path.join(this.baseUploadDir, '', type);

    try {
      // This automatically creates the 'public/uploads/type' folders if they don't exist
      await fs.promises.mkdir(targetDir, { recursive: true });

      const filePath = path.join(targetDir, filename);

      if (!file.buffer) {
        throw new InternalServerErrorException(
          'Uploaded file buffer is missing',
        );
      }

      // Write the binary data to disk
      await fs.promises.writeFile(filePath, file.buffer);

      // Return the uniform web URL matching your main.ts setup
      return `/public/uploads/${type}/${filename}`;
    } catch (error) {
      console.error('Local File Save Error:', error);
      throw new InternalServerErrorException('Failed to write file to disk');
    }
  }

  static async deleteFile(relativeUrl: string): Promise<void> {
    // This finds '/public/uploads/...' regardless of what domain name sits in front of it
    const match = relativeUrl.match(/\/public\/uploads\/.+$/);
    if (!match) return;

    // Turn '/public/uploads/...' into 'public/uploads/...'
    const sanitizedPath = match[0].substring(1);
    const absolutePath = path.resolve(process.cwd(), sanitizedPath);

    try {
      if (fs.existsSync(absolutePath)) {
        await fs.promises.unlink(absolutePath);
      }
    } catch (error) {
      console.error('Local File Delete Error:', error);
      throw new InternalServerErrorException('Failed to delete file from disk');
    }
  }
}
