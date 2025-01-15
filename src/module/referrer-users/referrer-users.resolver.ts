// src/module/referrer-users/referrer-users.resolver.ts

import { Resolver, Mutation, Args, Query, Context } from '@nestjs/graphql';
import { ReferrerUsersService } from './referrer-users.service';
import { ReferrerUser } from './referrer-users.schema';

@Resolver(() => ReferrerUser)
export class ReferrerUsersResolver {
  constructor(private readonly referrerUsersService: ReferrerUsersService) {}

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

  @Query(() => [ReferrerUser])
  async getReferrerUsers(@Context() context: any): Promise<ReferrerUser[]> {
    const user = context.req.user;
    return this.referrerUsersService.getReferrerUsers(user.id);
  }
}
