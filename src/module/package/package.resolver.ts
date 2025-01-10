// src/package/package.resolver.ts

import { Resolver, Query, Context } from '@nestjs/graphql';
import { PackageService } from './package.service';
import { Package } from './package.schema';
//import { UnauthorizedException } from '@nestjs/common';

@Resolver(() => Package)
export class PackageResolver {
  constructor(private readonly packageService: PackageService) {}

  // 패키지 목록 조회
  @Query(() => [Package])
  async getPackages(@Context() context: any): Promise<Package[]> {
    const user = context.req.user; // 인증된 사용자 정보

    const data = await this.packageService.getPackages(user); // 인증된 사용자 정보로 패키지 조회

    return data;

    //return this.packageService.getPackages(user); // 인증된 사용자 정보로 패키지 조회
  }

  // 패키지 추가
  // @Mutation(() => Package)
  // async addPackage(
  //   @Args('name') name: string,
  //   @Args('price') price: number,
  //   @Args('status') status: string,
  //   @Context() context: any,
  // ): Promise<Package> {
  //   const user = context.req.user; // 인증된 사용자 정보

  //   return this.packageService.addPackage({ name, price, status });
  // }

  // 패키지 수정
  // @Mutation(() => Package)
  // async changePackage(
  //   @Args('name') name: string,
  //   @Args('price') price: number,
  //   @Args('logInterval') logInterval: number,
  //   @Args('status') status: string,
  //   @Context() context: any,
  // ): Promise<Package> {
  //   const user = context.req.user; // 인증된 사용자 정보

  //   // 관리자인지 확인
  //   const isAdmin = await this.packageService.verifyAdmin(user);
  //   if (!isAdmin) {
  //     throw new UnauthorizedException(
  //       'You are not authorized to change package prices.',
  //     );
  //   }

  //   return this.packageService.changePackage(name, price, logInterval, status);
  // }
}
