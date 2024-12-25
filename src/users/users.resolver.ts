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
    const authHeader = context.req.headers.authorization;

    console.log('UsersResolver - getUserInfo : ', authHeader);

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing.');
    }

    const user = await this.usersService.getUserInfo(authHeader);
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
    @Context() context: any,
  ): Promise<string> {
    console.log('UsersResolver - Context req.user:', context.req.user);
    console.log('UsersResolver - Login email:', email, 'password:', password);

    if (context.req.user?.mode === 'login') {
      const token = await this.usersService.login(email, password);
      console.log('UsersResolver - Generated Token:', token);
      return token;
    }

    throw new Error('Login mode not detected');
  }
}
