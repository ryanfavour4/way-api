import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  paginate,
  PaginateQuery,
  Paginated,
  FilterOperator,
} from 'nestjs-paginate';
import { Store } from './entities/store.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { VerifyStoreDto } from './dto/verify-store.dto';
import { User, UserRole } from 'src/users/entities/users.entity';
import { Upload } from 'src/uploads/entities/upload.entity';

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    @InjectRepository(Upload)
    private readonly uploadRepository: Repository<Upload>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Validate store image asset ownership and permissions
   */
  private async validateStoreImageAsset(
    uploadId: number,
    currentUser: User,
    assetLabel: 'logo' | 'storefront image',
    existingAssetId?: number,
  ): Promise<void> {
    const upload = await this.uploadRepository.findOne({
      where: { id: uploadId },
    });
    if (!upload) {
      throw new BadRequestException(
        `Store ${assetLabel} upload with ID ${uploadId} not found`,
      );
    }

    if (upload.resource_type !== 'image') {
      throw new BadRequestException(`Store ${assetLabel} must be an image`);
    }

    if (currentUser.role === UserRole.ADMIN) {
      return; // Admins have full access
    }

    // 1. Cross-user avatar check: cannot hijack another user's avatar
    const otherUser = await this.userRepository.findOne({
      where: { avatar_id: uploadId },
    });
    if (otherUser && otherUser.id !== currentUser.id) {
      throw new ForbiddenException(
        `You do not have permission to use another user's private avatar as a store ${assetLabel}`,
      );
    }

    // 2. Cross-merchant store check: cannot hijack another merchant's store asset
    const otherStore = await this.storeRepository.findOne({
      where: [
        { logo_id: uploadId },
        { storefront_image_id: uploadId },
      ],
    });
    if (otherStore && otherStore.merchant_id !== currentUser.id) {
      throw new ForbiddenException(
        `You do not have permission to use another merchant's store asset as a store ${assetLabel}`,
      );
    }

    // 3. Upload ownership & unassigned asset protection:
    if (
      upload.uploaded_by_user_id !== undefined &&
      upload.uploaded_by_user_id !== null
    ) {
      if (upload.uploaded_by_user_id !== currentUser.id) {
        throw new ForbiddenException(
          `You do not have permission to use an upload created by another user as a store ${assetLabel}`,
        );
      }
    } else {
      // upload.uploaded_by_user_id is null (legacy unassigned or uncertain record)
      const isAlreadyAssignedToThisStore = existingAssetId === uploadId;
      if (!isAlreadyAssignedToThisStore) {
        throw new ForbiddenException(
          `Unassigned uploads with unverified ownership can only be assigned by an administrator`,
        );
      }
    }
  }

  /**
   * Create a new Store linked to the authenticated merchant
   */
  async create(
    userOrId: User | number,
    dto: CreateStoreDto,
  ): Promise<Store> {
    let merchantId: number;
    let currentUser: User | null = null;

    if (typeof userOrId === 'number') {
      merchantId = userOrId;
      currentUser = await this.userRepository.findOne({
        where: { id: merchantId },
      });
    } else {
      merchantId = userOrId.id;
      currentUser = userOrId;
    }

    // Validate logo_id if provided
    if (dto.logo_id !== undefined && dto.logo_id !== null && currentUser) {
      await this.validateStoreImageAsset(dto.logo_id, currentUser, 'logo');
    }

    // Validate storefront_image_id if provided
    if (
      dto.storefront_image_id !== undefined &&
      dto.storefront_image_id !== null &&
      currentUser
    ) {
      await this.validateStoreImageAsset(
        dto.storefront_image_id,
        currentUser,
        'storefront image',
      );
    }

    const baseSlug = dto.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

    const store = this.storeRepository.create({
      ...dto,
      merchant_id: merchantId,
      slug: uniqueSlug,
    });

    return await this.storeRepository.save(store);
  }

  /**
   * Paginated list query with category filters & multi-column search
   */
  async findAll(query: PaginateQuery): Promise<Paginated<Store>> {
    return paginate(query, this.storeRepository, {
      sortableColumns: [
        'id',
        'name',
        'rating_avg',
        'review_count',
        'created_at',
      ],
      nullSort: 'last',
      defaultSortBy: [['created_at', 'DESC']],
      searchableColumns: [
        'name',
        'legal_name',
        'description',
        'address_line',
        'landmark',
        'city',
      ],
      filterableColumns: {
        primary_category_id: [FilterOperator.EQ, FilterOperator.IN],
        secondary_category_id: [FilterOperator.EQ, FilterOperator.IN],
        tertiary_category_id: [FilterOperator.EQ, FilterOperator.IN],
        verification_status: [FilterOperator.EQ, FilterOperator.IN],
        store_type: [FilterOperator.EQ, FilterOperator.IN],
        is_active: [FilterOperator.EQ],
        city: [FilterOperator.EQ, FilterOperator.ILIKE],
        state: [FilterOperator.EQ],
      },
      relations: [
        'primary_category',
        'secondary_category',
        'tertiary_category',
        'logo',
        'storefront_image',
      ],
    });
  }

  /**
   * Fetch single store details
   */
  async findOne(id: number): Promise<Store> {
    const store = await this.storeRepository.findOne({
      where: { id },
      relations: [
        'primary_category',
        'secondary_category',
        'tertiary_category',
        'logo',
        'storefront_image',
        'merchant',
      ],
    });

    if (!store) {
      throw new NotFoundException(`Store with ID ${id} not found`);
    }

    return store;
  }

  /**
   * Update general store details
   */
  async update(
    id: number,
    currentUser: User,
    dto: UpdateStoreDto,
  ): Promise<Store> {
    const store = await this.findOne(id);

    // Ownership check: only the owning merchant or an ADMIN can update the store
    if (
      currentUser.role !== UserRole.ADMIN &&
      store.merchant_id !== currentUser.id
    ) {
      throw new ForbiddenException(
        'You do not have permission to modify this store',
      );
    }

    // Protect administrative and metric fields from being modified by ordinary merchants
    const safeDto = { ...dto };
    if (currentUser.role !== UserRole.ADMIN) {
      delete (safeDto as any).merchant_id;
      delete (safeDto as any).verification_status;
      delete (safeDto as any).verification_notes;
      delete (safeDto as any).verified_at;
      delete (safeDto as any).verified_by_user_id;
      delete (safeDto as any).has_verified_badge;
      delete (safeDto as any).verified_badge_expires_at;
      delete (safeDto as any).rating_avg;
      delete (safeDto as any).review_count;
      delete (safeDto as any).footfall_count;
    }

    // Validate logo_id
    if (safeDto.logo_id !== undefined) {
      if (safeDto.logo_id === null) {
        store.logo_id = undefined;
        delete (safeDto as any).logo_id;
      } else if (safeDto.logo_id !== store.logo_id) {
        await this.validateStoreImageAsset(
          safeDto.logo_id,
          currentUser,
          'logo',
          store.logo_id,
        );
      }
    }

    // Validate storefront_image_id
    if (safeDto.storefront_image_id !== undefined) {
      if (safeDto.storefront_image_id === null) {
        store.storefront_image_id = undefined;
        delete (safeDto as any).storefront_image_id;
      } else if (safeDto.storefront_image_id !== store.storefront_image_id) {
        await this.validateStoreImageAsset(
          safeDto.storefront_image_id,
          currentUser,
          'storefront image',
          store.storefront_image_id,
        );
      }
    }

    // If name changed, update base slug
    if (safeDto.name && safeDto.name !== store.name) {
      const baseSlug = safeDto.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      store.slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    }

    Object.assign(store, safeDto);
    return await this.storeRepository.save(store);
  }

  /**
   * Admin-only verification (Approve / Reject / Flag)
   */
  async verifyStore(
    id: number,
    adminId: number,
    dto: VerifyStoreDto,
  ): Promise<Store> {
    const store = await this.findOne(id);

    store.verification_status = dto.status;
    store.verified_by_user_id = adminId;
    store.verified_at = new Date();
    if (dto.notes) {
      store.verification_notes = dto.notes;
    }

    return await this.storeRepository.save(store);
  }

  /**
   * Soft Delete Store
   */
  async remove(
    id: number,
    currentUser: User,
  ): Promise<{ message: string }> {
    const store = await this.findOne(id);

    // Ownership check: only the owning merchant or an ADMIN can delete the store
    if (
      currentUser.role !== UserRole.ADMIN &&
      store.merchant_id !== currentUser.id
    ) {
      throw new ForbiddenException(
        'You do not have permission to delete this store',
      );
    }

    await this.storeRepository.softDelete(store.id);

    return { message: `Store ${id} has been soft deleted successfully` };
  }
}
