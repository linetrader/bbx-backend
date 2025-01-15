// src/module/referrer-logs/referrer-logs.resolver.ts

import { Resolver, Query, Context, Int, Args } from '@nestjs/graphql';
import { ReferrerLogsService } from './referrer-logs.service';
import { ReferrerLog } from './referrer-logs.schema';
import { AdminReferralLogsResponse } from './dto/referrer-response.dto';

@Resolver(() => ReferrerLog)
export class ReferrerLogsResolver {
  constructor(private readonly referrerLogsService: ReferrerLogsService) {}

  @Query(() => [ReferrerLog], { name: 'getReferralLogs' })
  async getReferralLogs(@Context() context: any): Promise<ReferrerLog[]> {
    const user = context.req.user;
    //if (!user) {}
    return this.referrerLogsService.getAllReferralLogs(user.id);
  }

  // Admin 사용자 로그 조회
  @Query(() => AdminReferralLogsResponse, { name: 'getAllReferralLogsAdmin' })
  async getAllReferralLogsAdmin(
    @Context() context: any,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
  ): Promise<{ data: ReferrerLog[]; total: number }> {
    const user = context.req.user;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const offset = (page - 1) * limit;

    return this.referrerLogsService.getAllReferralLogsAdmin(
      user.id,
      limit,
      offset,
    );
  }
}
