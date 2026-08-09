import { Injectable } from '@nestjs/common';
import { CreateExampleSwaggerDto } from './dto/create-example_swagger.dto';
import { UpdateExampleSwaggerDto } from './dto/update-example_swagger.dto';

@Injectable()
export class ExampleSwaggerService {
  create(createExampleSwaggerDto: CreateExampleSwaggerDto) {
    return 'This action adds a new exampleSwagger';
  }

  findAll() {
    return `This action returns all exampleSwagger`;
  }

  findOne(id: number) {
    return `This action returns a #${id} exampleSwagger`;
  }

  update(id: number, updateExampleSwaggerDto: UpdateExampleSwaggerDto) {
    return `This action updates a #${id} exampleSwagger`;
  }

  remove(id: number) {
    return `This action removes a #${id} exampleSwagger`;
  }
}
