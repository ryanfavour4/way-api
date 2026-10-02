import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from 'src/users/entities/users.entity';
import { JWT_SECRET } from 'src/env';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailingModule } from 'src/mailing/mailing.module';
import { Upload } from 'src/uploads/entities/upload.entity';
import { UploadsService } from 'src/uploads/uploads.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Upload]),
    JwtModule.register({
      global: true,
      secret: JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
    MailingModule,
  ],
  providers: [AuthService, UploadsService],
  controllers: [AuthController],
  exports: [JwtModule, AuthService],
})
export class AuthModule {}
