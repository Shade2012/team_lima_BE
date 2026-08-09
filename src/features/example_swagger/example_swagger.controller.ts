import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ExampleSwaggerService } from './example_swagger.service';
import { CreateExampleSwaggerDto } from './dto/create-example_swagger.dto';
import { UpdateExampleSwaggerDto } from './dto/update-example_swagger.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Example Swagger')
@Controller('example-swagger')
export class ExampleSwaggerController {
  constructor(
    private readonly exampleSwaggerService: ExampleSwaggerService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a user',
  })
  create(@Body() dto: CreateExampleSwaggerDto) {
    return this.exampleSwaggerService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all users',
  })
  findAll() {
    return this.exampleSwaggerService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get user by ID',
  })
  findOne(@Param('id') id: string) {
    return this.exampleSwaggerService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update user',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateExampleSwaggerDto,
  ) {
    return this.exampleSwaggerService.update(+id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete user',
  })
  remove(@Param('id') id: string) {
    return this.exampleSwaggerService.remove(+id);
  }
}
