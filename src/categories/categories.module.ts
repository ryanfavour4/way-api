import { Module } from '@nestjs/common';
import { Category } from './entities/category.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { User } from 'src/users/entities/users.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Category, User])],
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
