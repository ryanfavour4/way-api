import { Module } from '@nestjs/common';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from './entities/store.entity';
import { User } from 'src/users/entities/users.entity';
import { Upload } from 'src/uploads/entities/upload.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Store, User, Upload])],
  controllers: [StoresController],
  providers: [StoresService],
})
export class StoresModule {}
