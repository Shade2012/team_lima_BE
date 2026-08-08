import { SetMetadata } from '@nestjs/common';
export const PUBLIC_KEY = "public_decorator";
export const Public = () => SetMetadata(PUBLIC_KEY, true);
