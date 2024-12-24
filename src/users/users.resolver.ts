// src/users/users.resolver.ts

import { Resolver, Mutation, Args, Query, Context } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { User } from './users.schema';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { LoginResponse } from './dto/login-response.dto';

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

  @Query(() => String, { nullable: true })
  async getWalletAddress(
    @Args('userId') userId: string,
  ): Promise<string | null> {
    console.log('Fetching wallet address for userId:', userId);
    const walletId = await this.usersService.findWalletId(userId);
    if (!walletId) {
      throw new BadRequestException('Wallet not found for this user');
    }

    // Optional: Fetch the wallet address directly
    const walletAddress = await this.usersService.getWalletAddress(walletId);
    console.log('Wallet found:', walletAddress);
    return walletAddress;
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

  @Mutation(() => LoginResponse)
  async login(
    @Args('email') email: string,
    @Args('password') password: string,
  ): Promise<LoginResponse> {
    return await this.usersService.login(email, password);
  }
}
