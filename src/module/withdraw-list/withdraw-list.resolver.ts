// src/withdraw-list/withdraw-list.resolver.ts

import { Resolver, Mutation, Query, Args, Context, Int } from '@nestjs/graphql';
import { WithdrawListService } from './withdraw-list.service';
import { WithdrawList } from './withdraw-list.schema';
import { GetPendingWithdrawalsPaginatedResponse } from './dto/get-pending-withdrawals-response.dto';
import { BadRequestException } from '@nestjs/common';

@Resolver()
export class WithdrawListResolver {
  constructor(private readonly withdrawListService: WithdrawListService) {}

  @Query(() => GetPendingWithdrawalsPaginatedResponse)
  async getPendingWithdrawalsAdmin(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Context() context: any,
  ): Promise<GetPendingWithdrawalsPaginatedResponse> {
    const user = context.req.user;

    if (!user) {
      throw new BadRequestException('Unauthorized: User not authenticated.');
    }

    const offset = (page - 1) * limit;
    const data = await this.withdrawListService.getPendingWithdrawalsAdmin(
      limit,
      offset,
      user,
    );
    const totalWithdrawals =
      await this.withdrawListService.getTotalPendingWithdrawals();

    return { data, totalWithdrawals };
  }

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
    const decoded = context.req.user; // 인증된 사용자 정보에서 email을 가져옵니다.
    return this.withdrawListService.processWithdrawalRequest(
      decoded.id,
      decoded.email,
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
