import { applyDecorators } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { BaseResponseDto } from 'src/utils/base_response_dto';

export function ApiFailureResponse(
  status = 400,
  message = 'Request failed',
) {
  return applyDecorators(
    ApiExtraModels(BaseResponseDto),
    ApiResponse({
      status,
      description: message,
      schema: {
        $ref: getSchemaPath(BaseResponseDto),
      },
    }),
  );
}