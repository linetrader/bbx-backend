// src/module/referrer-logs/referrer-logs.resolver.ts

import { Resolver, Query } from '@nestjs/graphql';
import { ReferrerLogsService } from './referrer-logs.service';
import { ReferrerLog } from './referrer-logs.schema';

@Resolver(() => ReferrerLog)
export class ReferrerLogsResolver {
  constructor(private readonly referrerLogsService: ReferrerLogsService) {}

  @Query(() => [ReferrerLog], { name: 'getReferralLogs' })
  async getReferralLogs(): Promise<ReferrerLog[]> {
    return this.referrerLogsService.getAllReferralLogs();
  }
}
