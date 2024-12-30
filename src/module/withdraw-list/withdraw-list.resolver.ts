// src/withdraw-list/withdraw-list.resolver.ts

import { Resolver, Mutation, Query, Args, Context } from '@nestjs/graphql';
import { WithdrawListService } from './withdraw-list.service';
import { WithdrawList } from './withdraw-list.schema';
import { UnauthorizedException } from '@nestjs/common';

@Resolver()
export class WithdrawListResolver {
  constructor(private readonly withdrawListService: WithdrawListService) {}

  @Query(() => [WithdrawList])
  async getPendingWithdrawals(
    @Context() context: any,
  ): Promise<WithdrawList[]> {
    const authHeader = context.req.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing.');
    }

    const token = authHeader.split(' ')[1];
    return this.withdrawListService.getPendingWithdrawals(token);
  }

  @Mutation(() => Boolean)
  async requestWithdrawal(
    @Args('currency') currency: string,
    @Args('amount') amount: number,
    @Args('otp') otp: string,
    @Context() context: any,
  ): Promise<boolean> {
    const authHeader = context.req.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing.');
    }

    const token = authHeader.split(' ')[1];
    return this.withdrawListService.processWithdrawalRequest(
      token,
      currency,
      amount,
      otp,
    );
  }

  @Mutation(() => Boolean)
  async approveWithdrawal(
    @Args('withdrawalId') withdrawalId: string,
    @Context() context: any,
  ): Promise<boolean> {
    const authHeader = context.req.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing.');
    }

    const token = authHeader.split(' ')[1];
    return this.withdrawListService.approveWithdrawal(withdrawalId, token);
  }

  @Mutation(() => Boolean)
  async rejectWithdrawal(
    @Args('withdrawalId') withdrawalId: string,
    @Args('remarks', { nullable: true }) remarks: string,
    @Context() context: any,
  ): Promise<boolean> {
    const authHeader = context.req.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing.');
    }

    const token = authHeader.split(' ')[1];
    return this.withdrawListService.rejectWithdrawal(withdrawalId, token);
  }
}
