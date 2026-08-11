import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateGateDto } from './create-gate.dto';

export class UpdateGateDto extends PartialType(
  OmitType(CreateGateDto, ['eventId'] as const),
) {}
