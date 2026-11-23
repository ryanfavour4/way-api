import {
  Controller,
  Post,
  UseInterceptors,
  Body,
  UseGuards,
  BadRequestException,
  Get,
  Param,
  ParseIntPipe,
  Delete,
  UploadedFiles,
  Req,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from 'src/auth/guard/auth.guard';
import { allowedPaths } from './local-storage.engine';
import { User } from 'src/users/entities/users.entity';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  // Use FilesInterceptor. The second parameter '10' is the maximum allowed files at once
  @UseInterceptors(FilesInterceptor('file', 10))
  async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[], // <-- Expect an array now
    @Body('type') type: string,
    @Req() req: { user: User },
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    if (type && !allowedPaths.includes(type)) {
      throw new BadRequestException(
        `Invalid type. Allowed types are: ${allowedPaths.join(', ')}`,
      );
    }

    const uploadType = type || 'general';

    // Map over the array to save every file through your engine loop
    const uploadPromises = files.map((file) =>
      this.uploadsService.uploadFile(file, uploadType, req.user),
    );

    return Promise.all(uploadPromises);
  }

  // make the endpoint to get all the uploaded files and also files by id
  @Get()
  @UseGuards(JwtAuthGuard) // Protect this so random people can't see all filenames
  async findAll() {
    return this.uploadsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.uploadsService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: User },
  ) {
    return this.uploadsService.remove(id, req.user);
  }
}
