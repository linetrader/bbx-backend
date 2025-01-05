// src/wallets/wallets.resolver.ts

import { Resolver, Mutation, Query, Context, Args } from '@nestjs/graphql';
import { WalletsService } from './wallets.service';
import { BadRequestException } from '@nestjs/common';
import { Wallet } from './wallets.schema';

@Resolver()
export class WalletsResolver {
  constructor(private readonly walletService: WalletsService) {}

  @Query(() => Wallet)
  async getWalletInfo(@Context() context: any): Promise<Wallet | null> {
    const user = context.req.user; // 인증된 사용자 정보
    return this.walletService.getWalletInfo(user); // 인증된 사용자 정보 전달
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
