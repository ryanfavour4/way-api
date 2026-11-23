import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/users.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { Upload } from 'src/uploads/entities/upload.entity';
import { Store } from 'src/stores/entities/store.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Upload, Store]), AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
