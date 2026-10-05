import { Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
  ) {}

  /**
   * Create a new Store linked to the authenticated merchant
   */
  async create(merchantId: number, dto: CreateStoreDto): Promise<Store> {
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
  async update(id: number, dto: UpdateStoreDto): Promise<Store> {
    const store = await this.findOne(id);

    // If name changed, update base slug
    if (dto.name && dto.name !== store.name) {
      const baseSlug = dto.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      store.slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    }

    Object.assign(store, dto);
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
  async remove(id: number): Promise<{ message: string }> {
    const store = await this.findOne(id);
    await this.storeRepository.softDelete(store.id);

    return { message: `Store ${id} has been soft deleted successfully` };
  }
}
