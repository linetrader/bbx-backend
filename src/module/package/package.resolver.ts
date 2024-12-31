// src/package/package.resolver.ts

import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { PackageService } from './package.service';
import { Package } from './package.schema';
import { UnauthorizedException } from '@nestjs/common';

@Resolver(() => Package)
export class PackageResolver {
  constructor(private readonly packageService: PackageService) {}

  @Query(() => [Package])
  async getPackages(@Context() context: any): Promise<Package[]> {
    const authHeader = context.req.headers.authorization;
    return this.packageService.getPackages(authHeader);
  }

  @Mutation(() => Package)
  async addPackage(
    @Args('name') name: string,
    @Args('price') price: number,
    @Args('status') status: string,
    @Context() context: any,
  ): Promise<Package> {
    const authHeader = context.req.headers.authorization;
    const isAdmin = await this.packageService.verifyAdmin(authHeader);
    if (!isAdmin) {
      throw new UnauthorizedException(
        'You are not authorized to add packages.',
      );
    }
    return this.packageService.addPackage({ name, price, status });
  }

  @Mutation(() => Package)
  async changePackage(
    @Args('name') name: string,
    @Args('price') price: number,
    @Args('miningInterval') miningInterval: number,
    @Args('status') status: string,
    @Context() context: any,
  ): Promise<Package> {
    const authHeader = context.req.headers.authorization;
    const isAdmin = await this.packageService.verifyAdmin(authHeader);
    if (!isAdmin) {
      throw new UnauthorizedException(
        'You are not authorized to change package prices.',
      );
    }
    return this.packageService.changePackage(
      name,
      price,
      miningInterval,
      status,
    );
  }
}
