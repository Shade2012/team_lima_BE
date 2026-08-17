import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateTicketCategoryDto } from './create-ticket-category.dto';
import { IsArray, IsString } from 'class-validator';

export class UpdateTicketCategoryDto extends PartialType(
  OmitType(CreateTicketCategoryDto, ['eventId'] as const),
) {}
