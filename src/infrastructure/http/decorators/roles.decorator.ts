import { SetMetadata } from '@nestjs/common';
import { GroupRole } from '../../../modules/group/domain/types/group.types';

export const ROLES_KEY = 'group_roles';
export const RequireGroupRole = (...roles: GroupRole[]) => SetMetadata(ROLES_KEY, roles);
