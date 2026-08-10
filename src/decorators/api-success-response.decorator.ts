import { SetMetadata } from '@nestjs/common';

import {
  applyDecorators,
  Type,
} from '@nestjs/common';

import {
  ApiExtraModels,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { BaseResponseDto } from 'src/utils/base_response_dto';

export enum PrimitiveType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
}

type ResponseType = PrimitiveType | Type<unknown>;

export function ApiSuccessResponse(
  type?: ResponseType,
  status = 200,
  message = 'Request successful',
) {
  const isPrimitive = typeof type === 'string';

  return applyDecorators(
    ApiExtraModels(
      BaseResponseDto,
      ...(type && !isPrimitive ? [type] : []),
    ),

    ApiResponse({
      status,
      description: message,
      schema: type
        ? {
            allOf: [
              {
                $ref: getSchemaPath(BaseResponseDto),
              },
              {
                properties: {
                  data: isPrimitive
                    ? {
                        type,
                      }
                    : {
                        $ref: getSchemaPath(type),
                      },
                },
              },
            ],
          }
        : {
            $ref: getSchemaPath(BaseResponseDto),
          },
    }),
  );
}