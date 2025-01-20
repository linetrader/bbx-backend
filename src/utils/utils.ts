import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../module/users/users.service';

export const checkAdminAccess = async (
  usersService: UsersService,
  userId: string,
) => {
  const requestingUser = await usersService.isValidAdmin(userId);
  if (!requestingUser) {
    throw new BadRequestException(
      'Unauthorized: Access is restricted to admins only.',
    );
  }
};

export const checkSuperUserAccess = async (
  usersService: UsersService,
  userId: string,
) => {
  const isSuperUser = await usersService.isValidSuperUser(userId);
  if (!isSuperUser) {
    throw new BadRequestException(
      'Unauthorized: Access is restricted to super admins only.',
    );
  }
};

export const checkUserAuthentication = (user: { id: string }) => {
  if (!user || !user.id) {
    throw new UnauthorizedException('User not authenticated');
  }
};
