// src/module/package/package-users.resolver.ts

import { Resolver, Query, Mutation, Args, Context, Int } from '@nestjs/graphql';
import { PackageUsersService } from './package-users.service';
import { PackageUsers } from './package-users.schema';

@Resolver(() => PackageUsers)
export class PackageUsersResolver {
  constructor(private readonly packageUsersService: PackageUsersService) {}

  // 3. 유저의 패키지 마이닝 수량 조회
  @Query(() => [PackageUsers])
  async getUserMiningData(
    @Context() context: any,
  ): Promise<PackageUsers[] | null> {
    const user = context.req.user;
    return this.packageUsersService.getUserPackages(user); // 인증된 사용자 정보를 사용
  }

  // 1. 패키지 구매
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
      user, // 인증된 사용자 정보를 전달
      packageId,
      quantity,
      customerName,
      customerPhone,
      customerAddress,
    );
  }
}
