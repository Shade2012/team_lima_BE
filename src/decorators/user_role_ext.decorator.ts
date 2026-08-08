import { SetMetadata } from '@nestjs/common';
import { UserRole } from 'src/utils/user_role';
export const USER_ROLE_EXT_DECORATOR_KEY = "userRole"
export const UserRoleExt = (...args: UserRole[]) => SetMetadata(USER_ROLE_EXT_DECORATOR_KEY, args);
