import { SetMetadata } from '@nestjs/common';
import { JwtUserRole } from '../../../../libs/contracts/messages';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: JwtUserRole[]) => SetMetadata(ROLES_KEY, roles);
