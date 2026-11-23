import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from './entities/users.entity';
import { Upload } from 'src/uploads/entities/upload.entity';
import { Store } from 'src/stores/entities/store.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Upload)
    private uploadRepo: Repository<Upload>,
    @InjectRepository(Store)
    private storeRepo: Repository<Store>,
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

  async update(
    id: number,
    currentUser: User,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    // 1. Ownership & Authorization check:
    // Only the user themselves or an ADMIN can update the profile
    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException(
        'You do not have permission to update this user',
      );
    }

    const user = await this.findOne(id);

    // 2. If username is being changed, check for uniqueness
    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUser = await this.userRepo.findOne({
        where: { username: updateUserDto.username },
      });
      if (existingUser && existingUser.id !== id) {
        throw new BadRequestException('Username is already taken');
      }
    }

    // 3. Explicit whitelist of allowed fields - defense in depth against mass assignment
    const {
      fullname,
      username,
      bio,
      location,
      phone_number,
      date_of_birth,
      gender,
      avatar_id,
    } = updateUserDto;

    const safeUpdateData: Partial<User> = {};
    if (fullname !== undefined) safeUpdateData.fullname = fullname;
    if (username !== undefined) safeUpdateData.username = username;
    if (bio !== undefined) safeUpdateData.bio = bio;
    if (location !== undefined) safeUpdateData.location = location;
    if (phone_number !== undefined) safeUpdateData.phone_number = phone_number;
    if (date_of_birth !== undefined)
      safeUpdateData.date_of_birth = date_of_birth;
    if (gender !== undefined) safeUpdateData.gender = gender;

    // 4. Secure Avatar Validation
    if (avatar_id !== undefined) {
      if (avatar_id === null) {
        // User explicitly removing their avatar
        safeUpdateData.avatar_id = undefined;
      } else {
        // A. Validate that the upload exists
        const upload = await this.uploadRepo.findOne({
          where: { id: avatar_id },
        });
        if (!upload) {
          throw new BadRequestException(
            `Avatar upload with ID ${avatar_id} not found`,
          );
        }

        // B. Validate that the upload is an image
        if (upload.resource_type !== 'image') {
          throw new BadRequestException('Avatar upload must be an image');
        }

        // C. If caller is not ADMIN, enforce upload permission and ownership checks
        if (currentUser.role !== UserRole.ADMIN) {
          // Check 1: Cross-user avatar check
          const otherUser = await this.userRepo.findOne({
            where: { avatar_id },
          });
          if (otherUser && otherUser.id !== id) {
            throw new ForbiddenException(
              "You do not have permission to use another user's private avatar",
            );
          }

          // Check 2: Cross-merchant store check
          const otherStore = await this.storeRepo.findOne({
            where: [{ logo_id: avatar_id }, { storefront_image_id: avatar_id }],
          });
          if (otherStore && otherStore.merchant_id !== currentUser.id) {
            throw new ForbiddenException(
              "You do not have permission to use another merchant's store asset as your avatar",
            );
          }

          // Check 3: Upload ownership & unassigned asset protection
          if (
            upload.uploaded_by_user_id !== undefined &&
            upload.uploaded_by_user_id !== null
          ) {
            if (upload.uploaded_by_user_id !== currentUser.id) {
              throw new ForbiddenException(
                'You do not have permission to use an upload created by another user',
              );
            }
          } else {
            // upload.uploaded_by_user_id is null (legacy unassigned or uncertain record)
            const isAlreadyMyAvatar = user.avatar_id === avatar_id;
            if (!isAlreadyMyAvatar) {
              throw new ForbiddenException(
                'Unassigned uploads with unverified ownership can only be assigned by an administrator',
              );
            }
          }
        }

        safeUpdateData.avatar_id = avatar_id;
      }
    }

    // Apply the update
    Object.assign(user, safeUpdateData);
    return await this.userRepo.save(user);
  }

  async remove(id: number, currentUser: User): Promise<{ message: string }> {
    // 1. Authorization check:
    // Only the user themselves or an ADMIN can delete an account
    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException(
        'You do not have permission to delete this user',
      );
    }

    // Ensure the user exists
    await this.findOne(id);

    // Soft delete to preserve historical integrity and avoid cascading data loss
    await this.userRepo.softDelete(id);
    return { message: `User #${id} successfully removed` };
  }
}
