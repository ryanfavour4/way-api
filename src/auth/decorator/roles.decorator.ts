import { SetMetadata } from '@nestjs/common';
import { UserRole } from 'src/users/entities/users.entity';

export const ROLES_KEY = 'roles';

/**
 * Custom decorator to restrict controller endpoints by UserRole enum
 * Usage: @Roles(UserRole.ADMIN, UserRole.ADMIN_STAFF)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
