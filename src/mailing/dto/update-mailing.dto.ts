import { PartialType } from '@nestjs/mapped-types';
import { SendManualMailDto } from './create-mailing.dto';

export class UpdateMailingDto extends PartialType(SendManualMailDto) {}
