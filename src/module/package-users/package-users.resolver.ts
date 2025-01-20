// src/module/package/package-users.resolver.ts

import { Resolver, Query, Mutation, Args, Context, Int } from '@nestjs/graphql';
import { PackageUsersService } from './package-users.service';
import { PackageUsers } from './package-users.schema';
import { GetMiningCustomersResponse } from './dto/package-users.dto';
import { UnauthorizedException } from '@nestjs/common';

@Resolver(() => PackageUsers)
export class PackageUsersResolver {
  constructor(private readonly packageUsersService: PackageUsersService) {}

  @Query(() => GetMiningCustomersResponse, {
    description: 'Fetch mining customers with pagination for admin',
  })
  async getMiningCustomers(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Context() context: any,
  ): Promise<GetMiningCustomersResponse> {
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('Unauthorized: User not authenticated.');
    }

    const offset = (page - 1) * limit;
    const { data, totalCustomers } =
      await this.packageUsersService.getMiningCustomers(limit, offset, user);

    return { data, totalCustomers };
  }

  @Query(() => [PackageUsers])
  async getUserMiningData(
    @Context() context: any,
  ): Promise<PackageUsers[] | null> {
    const user = context.req.user;
    return this.packageUsersService.getUserPackages(user);
  }

  @Mutation(() => String)
  async purchasePackage(
    @Args('packageId', { type: () => String }) packageId: string,
    @Args('quantity', { type: () => Int }) quantity: number,
    @Args('customerName', { type: () => String }) customerName: string,
    @Args('customerPhone', { type: () => String }) customerPhone: string,
    @Args('customerAddress', { type: () => String }) customerAddress: string,
    @Context() context: any,
  ): Promise<string> {
    const user = context.req.user;
    return this.packageUsersService.purchasePackage(
      user,
      packageId,
      quantity,
      customerName,
      customerPhone,
      customerAddress,
    );
  }

  @Mutation(() => Boolean)
  async confirmContract(
    @Args('contractId', { type: () => String }) contractId: string,
    @Args('username', { type: () => String }) username: string,
    @Args('packageName', { type: () => String }) packageName: string,
    @Args('quantity', { type: () => Int }) quantity: number,
    @Context() context: any,
  ): Promise<boolean> {
    const user = context.req.user;
    return await this.packageUsersService.confirmPackage(
      contractId,
      username,
      packageName,
      quantity,
      user.id,
    );
  }
}
