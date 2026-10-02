import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { Upload } from './entities/upload.entity';
import { CloudinaryProvider } from 'src/config/upload.cloudinary';
import { AuthModule } from 'src/auth/auth.module';
import { User } from 'src/users/entities/users.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Upload, User]), AuthModule],
  controllers: [UploadsController],
  providers: [UploadsService, CloudinaryProvider],
  exports: [UploadsService, TypeOrmModule], // <-- Add TypeOrmModule here
})
export class UploadsModule {}
