import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Paginate, type PaginateQuery, Paginated } from 'nestjs-paginate';
import { NewsletterService } from './newsletter.service';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';
import { UnsubscribeNewsletterDto } from './dto/unsubscribe-newsletter.dto';
import { NewsletterSubscriber } from './entities/newsletter-subscriber.entity';
import { JwtAuthGuard } from 'src/auth/guard/auth.guard';
import { RolesGuard } from 'src/auth/guard/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { UserRole } from 'src/users/entities/users.entity';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  /**
   * Public: Subscribe an email address to the newsletter
   */
  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  async subscribe(@Body() dto: SubscribeNewsletterDto) {
    return this.newsletterService.subscribe(dto);
  }

  /**
   * Public: Unsubscribe an email address from the newsletter
   */
  @Post('unsubscribe')
  @HttpCode(HttpStatus.OK)
  async unsubscribe(@Body() dto: UnsubscribeNewsletterDto) {
    return this.newsletterService.unsubscribe(dto);
  }

  /**
   * Admin: List subscribers with pagination, search, and status filtering
   */
  @Get('admin/subscribers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ADMIN_STAFF)
  async findAll(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<NewsletterSubscriber>> {
    return this.newsletterService.findAll(query);
  }

  /**
   * Admin: View specific subscriber details
   */
  @Get('admin/subscribers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ADMIN_STAFF)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.newsletterService.findOne(id);
  }
}
