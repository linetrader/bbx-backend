// src/wallets/wallets.resolver.ts

import { Resolver, Mutation, Query, Context, Args, Int } from '@nestjs/graphql';
import { WalletsService } from './wallets.service';
import { BadRequestException } from '@nestjs/common';
import { Wallet } from './wallets.schema';
import { GetWalletsResponse } from './dto/get-wallets-response.dto'; // 응답 DTO 정의

@Resolver()
export class WalletsResolver {
  constructor(private readonly walletService: WalletsService) {}

  @Query(() => Wallet)
  async getWalletInfo(@Context() context: any): Promise<Wallet | null> {
    const user = context.req.user; // 인증된 사용자 정보
    return this.walletService.getWalletInfo(user); // 인증된 사용자 정보 전달
  }

  @Query(() => GetWalletsResponse) // 지갑 데이터와 총 개수 반환
  async getWallets(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Context() context: any,
  ): Promise<{ data: Wallet[]; totalWallets: number }> {
    const user = context.req.user; // 인증된 사용자 정보
    const offset = (page - 1) * limit; // Offset 계산

    const data = await this.walletService.getWallets(limit, offset, user);
    const totalWallets = await this.walletService.getTotalWallets();

    return { data, totalWallets };
  }

  @Mutation(() => Wallet)
  async createWallet(@Context() context: any): Promise<Wallet> {
    const user = context.req.user; // 인증된 사용자 정보
    const wallet = await this.walletService.createWallet(user); // 인증된 사용자 정보 전달
    if (!wallet) {
      throw new BadRequestException('Failed to create wallet');
    }

    return wallet;
  }

  @Mutation(() => Boolean)
  async saveWithdrawAddress(
    @Args('newAddress') newAddress: string,
    @Args('otp') otp: string,
    @Context() context: any,
  ): Promise<boolean> {
    console.log('[DEBUG] Context:', context);

    const user = context.req?.user; // 인증된 사용자 정보 확인
    console.log('[DEBUG] Extracted user:', user);

    if (!user) {
      console.error('[ERROR] User is not authenticated');
      throw new BadRequestException('User is not authenticated');
    }

    return this.walletService.saveWithdrawAddress(user, newAddress, otp);
  }
}
