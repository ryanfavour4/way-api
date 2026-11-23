import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MailingModule } from './mailing/mailing.module';
import { dataSourceOption } from 'db/data-source';
import { StoresModule } from './stores/stores.module';
import { StoreOperatingHoursModule } from './store_operating_hours/store_operating_hours.module';
import { CategoriesModule } from './categories/categories.module';
import { StoreSubscriptionModule } from './store_subscription/store_subscription.module';
import { UploadsModule } from './uploads/uploads.module';
import { NewsletterModule } from './newsletter/newsletter.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(dataSourceOption),
    AuthModule,
    UsersModule,
    MailingModule,
    StoresModule,
    StoreOperatingHoursModule,
    CategoriesModule,
    StoreSubscriptionModule,
    UploadsModule,
    NewsletterModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
