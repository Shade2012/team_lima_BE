import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateTicketCategoryDto } from './create-ticket-category.dto';

export class UpdateTicketCategoryDto extends PartialType(
  OmitType(CreateTicketCategoryDto, ['eventId'] as const),
) {}
