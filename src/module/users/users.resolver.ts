// src/users/users.resolver.ts

import { Resolver, Mutation, Args, Query, Context } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { User } from './users.schema';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => User)
  async getUserInfo(@Context() context: any): Promise<User> {
    const user = context.req.user; // 인증된 사용자 정보

    if (!user || !user.id) {
      throw new UnauthorizedException('User is not authenticated');
    }

    const userInfo = await this.usersService.getUserInfo(user); // 인증된 사용자 정보 전달
    if (!userInfo) {
      throw new BadRequestException('User not found');
    }

    return userInfo;
  }

  @Mutation(() => String)
  async register(
    @Args('email') email: string,
    @Args('username') username: string,
    @Args('firstname') firstname: string,
    @Args('lastname') lastname: string,
    @Args('password') password: string,
    @Args('referrer', { nullable: true }) referrer?: string,
  ): Promise<string> {
    return await this.usersService.register({
      email,
      username,
      firstname,
      lastname,
      password,
      referrer,
    });
  }

  @Mutation(() => String)
  async login(
    @Args('email') email: string,
    @Args('password') password: string,
  ): Promise<string> {
    const token = await this.usersService.login(email, password);
    if (token) {
      return token;
    }

    throw new UnauthorizedException('UsersResolver - Token Not Found');
  }
}
