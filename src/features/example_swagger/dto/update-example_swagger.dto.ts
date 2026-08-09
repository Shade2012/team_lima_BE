import { PartialType } from '@nestjs/swagger';
import { CreateExampleSwaggerDto } from './create-example_swagger.dto';

export class UpdateExampleSwaggerDto extends PartialType(CreateExampleSwaggerDto) {}
