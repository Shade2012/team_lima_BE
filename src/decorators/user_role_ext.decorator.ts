import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';
export const USER_ROLE_EXT_DECORATOR_KEY = "userRole"
export const UserRoleExt = (...args: Role[]) => SetMetadata(USER_ROLE_EXT_DECORATOR_KEY, args);
