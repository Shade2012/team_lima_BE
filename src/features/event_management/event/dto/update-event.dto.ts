import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateEventDto } from './create-event.dto';

export class UpdateEventDto extends PartialType(CreateEventDto) {
    @ApiProperty({
        type: 'string',
        format: 'binary',
        required: false,
        description: 'Event image',
    })
    image?: any;
}
