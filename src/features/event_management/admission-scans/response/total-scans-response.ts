import { ApiProperty } from "@nestjs/swagger";

export class TotalScansResponse {
    @ApiProperty({ example: '100' })
    scanned!: number;

    @ApiProperty({ example: '200' })
    total!: number;
}