import {
  BadRequestException,
  mixin,
  Type,
} from '@nestjs/common';
import {
  FileInterceptor,
} from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export function ImageUploadDefaultInterceptor(
  fieldName = 'image',
): Type<any> {
  return mixin(
    FileInterceptor(fieldName, {
      storage: memoryStorage(),

      limits: {
        fileSize: MAX_FILE_SIZE,
      },

      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Only JPEG, PNG, and WebP images are allowed',
            ),
            false,
          );
        }

        cb(null, true);
      },
    }),
  );
}