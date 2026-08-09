import { ApiProperty } from "@nestjs/swagger";

export class CreateExampleSwaggerDto {
    @ApiProperty({
        example:'John Doe',
        description:"Name example"
    })
    name!: string;

    @ApiProperty({
        example:10,
        description:"Age example"
    })
    age!:number
}
