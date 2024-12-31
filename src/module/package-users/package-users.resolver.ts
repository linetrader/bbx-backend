// src/module/package/package-users.resolver.ts

import { Resolver, Query, Mutation, Args, Context, Int } from '@nestjs/graphql';
import { PackageUsersService } from './package-users.service';
import { PackageUsers } from './package-users.schema';

@Resolver(() => PackageUsers)
export class PackageUsersResolver {
  constructor(private readonly packageUsersService: PackageUsersService) {}

  // 1. 패키지 구매
  @Mutation(() => String)
  async purchasePackage(
    @Args('packageId', { type: () => String }) packageId: string,
    @Args('quantity', { type: () => Int }) quantity: number,
    @Context() context: any,
  ): Promise<string> {
    const authHeader = context.req.headers.authorization;
    return this.packageUsersService.purchasePackage(
      authHeader,
      packageId,
      quantity,
    );
  }

  // 3. 유저의 패키지 수량 조회
  @Query(() => [PackageUsers])
  async getUserPackages(@Context() context: any): Promise<PackageUsers[]> {
    const authHeader = context.req.headers.authorization;
    return this.packageUsersService.getUserPackages(authHeader);
  }
}
