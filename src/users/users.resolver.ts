import { Resolver, Mutation, Args, Query, Context } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { User } from './users.schema';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => User)
  async me(@Context() context: any): Promise<User> {
    const userId = context.req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Not authenticated');
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  @Mutation(() => String)
  async register(
    @Args('email') email: string,
    @Args('username') username: string,
    @Args('firstname') firstname: string,
    @Args('lastname') lastname: string,
    @Args('password') password: string,
    @Args('referrer', { nullable: true }) referrer?: string, // 추천인 추가
  ): Promise<string> {
    try {
      return await this.usersService.register({
        email,
        username,
        firstname,
        lastname,
        password,
        referrer,
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new Error('An unexpected error occurred during registration');
    }
  }

  @Mutation(() => String)
  async login(
    @Args('email') email: string,
    @Args('password') password: string,
  ): Promise<string> {
    try {
      const { token } = await this.usersService.login(email, password);
      return token;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new Error('An unexpected error occurred during login');
    }
  }
}
