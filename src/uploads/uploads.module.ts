import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { Upload } from './entities/upload.entity';
import { CloudinaryProvider } from 'src/config/upload.cloudinary';
import { User } from 'src/users/entities/users.entity';
import { Store } from 'src/stores/entities/store.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Upload, User, Store])],
  controllers: [UploadsController],
  providers: [UploadsService, CloudinaryProvider],
  exports: [UploadsService, TypeOrmModule],
})
export class UploadsModule {}
