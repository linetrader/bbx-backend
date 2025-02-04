import { Resolver, Query, Args, Context, Int } from '@nestjs/graphql';
import { MiningLogsService } from './mining-logs.service';
import { MiningLog } from './mining-logs.schema';
import { UnauthorizedException } from '@nestjs/common';

@Resolver()
export class MiningLogsResolver {
  constructor(private readonly miningLogsService: MiningLogsService) {}

  @Query(() => [MiningLog])
  async getMiningLogsByDate(
    @Args('date') date: Date,
    @Context() context: any,
  ): Promise<MiningLog[]> {
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('Unauthorized: User not authenticated.');
    }

    return this.miningLogsService.getMiningLogsByDate(user.id, date);
  }

  @Query(() => Number)
  async get24HourMiningProfit(@Context() context: any): Promise<number> {
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('Unauthorized: User not authenticated.');
    }

    return this.miningLogsService.get24HourMiningProfit(user.id);
  }

  @Query(() => [MiningLog])
  async getAllMiningLogsGroupedByDay(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
    @Context() context: any,
  ): Promise<MiningLog[]> {
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('Unauthorized: User not authenticated.');
    }

    return this.miningLogsService.getAllMiningLogsGroupedByDay(
      user.id,
      limit,
      offset,
    );
  }
}
