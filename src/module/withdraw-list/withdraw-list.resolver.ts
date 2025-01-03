// src/withdraw-list/withdraw-list.resolver.ts

import { Resolver, Mutation, Query, Args, Context } from '@nestjs/graphql';
import { WithdrawListService } from './withdraw-list.service';
import { WithdrawList } from './withdraw-list.schema';

@Resolver()
export class WithdrawListResolver {
  constructor(private readonly withdrawListService: WithdrawListService) {}

  @Query(() => [WithdrawList])
  async getPendingWithdrawals(
    @Context() context: any,
  ): Promise<WithdrawList[]> {
    // context.req.user에서 인증된 사용자 정보를 가져옵니다.
    const { email } = context.req.user;
    return this.withdrawListService.getPendingWithdrawals(email);
  }

  @Mutation(() => Boolean)
  async requestWithdrawal(
    @Args('currency') currency: string,
    @Args('amount') amount: number,
    @Args('otp') otp: string,
    @Context() context: any,
  ): Promise<boolean> {
    const { email } = context.req.user; // 인증된 사용자 정보에서 email을 가져옵니다.
    return this.withdrawListService.processWithdrawalRequest(
      email,
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
    const { email } = context.req.user; // 인증된 사용자 정보에서 email을 가져옵니다.
    return this.withdrawListService.approveWithdrawal(withdrawalId, email);
  }

  @Mutation(() => Boolean)
  async rejectWithdrawal(
    @Args('withdrawalId') withdrawalId: string,
    @Args('remarks', { nullable: true }) remarks: string,
    @Context() context: any,
  ): Promise<boolean> {
    const { email } = context.req.user; // 인증된 사용자 정보에서 email을 가져옵니다.
    return this.withdrawListService.rejectWithdrawal(withdrawalId, email);
  }
}
