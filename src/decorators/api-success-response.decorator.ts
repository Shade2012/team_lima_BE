import { Type, applyDecorators } from "@nestjs/common";
import { getSchemaPath, ApiExtraModels, ApiResponse } from "@nestjs/swagger";
import { SchemaObject, ReferenceObject } from "node_modules/@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import { BaseResponseDto } from "src/utils/base_response_dto";


export enum PrimitiveType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
}

type ResponseType =
  | PrimitiveType
  | Type<unknown>
  | [Type<unknown>]
  | [PrimitiveType];

export function ApiSuccessResponse(
  type?: ResponseType,
  status = 200,
  message = 'Request successful',
  isArray = false,
) {
  let isArrayType = isArray;
  let targetType = type;

  // 1. Unwrap tuple syntax if provided (e.g., [OrderResponseDto])
  if (Array.isArray(type)) {
    isArrayType = true;
    targetType = type[0];
  }

  const isPrimitive = typeof targetType === 'string';

  // 2. Build schema object conditionally to avoid 'undefined' types
  let schema: SchemaObject | ReferenceObject;

  if (targetType) {
    const singleItemSchema: SchemaObject | ReferenceObject = isPrimitive
      ? { type: targetType as string }
      : { $ref: getSchemaPath(targetType as Type<unknown>) };

    const dataSchema: SchemaObject | ReferenceObject = isArrayType
      ? { type: 'array', items: singleItemSchema }
      : singleItemSchema;

    schema = {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        {
          properties: {
            data: dataSchema,
          },
        },
      ],
    };
  } else {
    schema = {
      $ref: getSchemaPath(BaseResponseDto),
    };
  }

  return applyDecorators(
    ApiExtraModels(
      BaseResponseDto,
      ...(targetType && !isPrimitive ? [targetType as Type<unknown>] : []),
    ),
    ApiResponse({
      status,
      description: message,
      schema,
    }),
  );
}