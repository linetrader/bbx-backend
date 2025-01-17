// src/module/referrer-users/referrer-users.resolver.ts

import { Resolver, Mutation, Args, Query, Context, Int } from '@nestjs/graphql';
import { ReferrerUsersService } from './referrer-users.service';
import { ReferrerUser } from './referrer-users.schema';

@Resolver(() => ReferrerUser)
export class ReferrerUsersResolver {
  constructor(private readonly referrerUsersService: ReferrerUsersService) {}

  @Query(() => [ReferrerUser])
  async getMiningGroup(@Context() context: any): Promise<ReferrerUser[]> {
    const user = context.req.user;
    return this.referrerUsersService.getMiningGroup(user.id);
  }

  @Query(() => [ReferrerUser])
  async getReferrerUsers(@Context() context: any): Promise<ReferrerUser[]> {
    const user = context.req.user;
    return this.referrerUsersService.getReferrerUsers(user.id);
  }

  @Mutation(() => ReferrerUser)
  async addMiningGroup(
    @Args('groupLeaderName') groupLeaderName: string,
    @Args('userName') userName: string,
    @Args('packageType') packageType: string,
    @Args('feeRateLeader', { type: () => Int }) feeRateLeader: number,
    @Args('feeRate', { type: () => Int }) feeRate: number,
    @Context() context: any,
  ): Promise<ReferrerUser> {
    const user = context.req.user;
    return this.referrerUsersService.addMiningGroup(
      user.id,
      groupLeaderName,
      userName,
      packageType,
      feeRateLeader,
      feeRate,
    );
  }

  // @Mutation(() => ReferrerUser)
  // async addMiningGroup(
  //   @Args('groupLeaderName') groupLeaderName: string,
  //   @Args('packageType') packageType: string,
  //   @Args('feeRate') feeRate: number,
  //   @Context() context: any,
  // ): Promise<ReferrerUser[]> {
  //   const user = context.req.user;
  //   return this.referrerUsersService.addMiningGroup(
  //     user.id,
  //     groupLeaderName,
  //     packageType,
  //     feeRate,
  //   );
  // }

  @Mutation(() => ReferrerUser)
  async addReferrerUser(
    @Args('userName') userName: string,
    @Args('referrerUserName') referrerUserName: string,
    @Args('packageType') packageType: string,
    @Args('feeRate') feeRate: number,
    @Context() context: any,
  ): Promise<ReferrerUser> {
    const user = context.req.user;
    return this.referrerUsersService.addReferrerUser(
      user.id,
      userName,
      referrerUserName,
      packageType,
      feeRate,
    );
  }
}
