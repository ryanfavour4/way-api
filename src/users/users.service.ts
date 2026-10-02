import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/users.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  findAll() {
    return this.userRepo.find({ order: { created_at: 'DESC' } });
  }

  // UPDATED: Proper async fetcher
  async findOne(id: number): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id: Number(id) }, // Forced cast to Number for safety
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  // HELPER: For your payment logic where you just want to check existence
  async exists(id: number): Promise<boolean> {
    const count = await this.userRepo.count({
      where: { id: Number(id) },
    });
    return count > 0;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return this.userRepo.update(id, updateUserDto);
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    return this.userRepo.remove(user);
  }
}
