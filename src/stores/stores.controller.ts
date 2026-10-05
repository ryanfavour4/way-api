import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
  Patch,
  Delete,
} from '@nestjs/common';
import { Paginate, type PaginateQuery, Paginated } from 'nestjs-paginate';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { Store } from './entities/store.entity';
import { JwtAuthGuard } from 'src/auth/guard/auth.guard';
import { RolesGuard } from 'src/auth/guard/roles.guard';
import { UserRole } from 'src/users/entities/users.entity';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { VerifyStoreDto } from './dto/verify-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  async create(@Req() req: any, @Body() dto: CreateStoreDto): Promise<Store> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-member-access
    return this.storesService.create(req.user.id as any, dto);
  }

  @Get()
  async findAll(@Paginate() query: PaginateQuery): Promise<Paginated<Store>> {
    return this.storesService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Store> {
    return this.storesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStoreDto,
  ): Promise<Store> {
    return this.storesService.update(id, dto);
  }

  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async verifyStore(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() dto: VerifyStoreDto,
  ): Promise<Store> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.storesService.verifyStore(id, req.user.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.storesService.remove(id);
  }
}
