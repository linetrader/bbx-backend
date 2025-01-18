// src/wallets/wallets.resolver.ts

import { Resolver, Mutation, Query, Context, Args, Int } from '@nestjs/graphql';
import { WalletsService } from './wallets.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Wallet } from './wallets.schema';
import { GetAdminWalletsResponse } from './dto/get-wallets-response.dto'; // 응답 DTO 정의

@Resolver()
export class WalletsResolver {
  constructor(private readonly walletsService: WalletsService) {}

  @Query(() => Wallet)
  async getWalletInfo(@Context() context: any): Promise<Wallet | null> {
    const user = context.req.user; // 인증된 사용자 정보
    return this.walletsService.getWalletInfo(user); // 인증된 사용자 정보 전달
  }

  @Query(() => GetAdminWalletsResponse)
  async getWalletsAdmin(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Context() context: any,
  ): Promise<GetAdminWalletsResponse> {
    const user = context.req.user;
    if (!user) {
      throw new BadRequestException('Unauthorized: User not authenticated.');
    }

    const offset = (page - 1) * limit;

    // 지갑 데이터와 총 사용자 수를 함께 반환
    const { data, totalWallets } = await this.walletsService.getWalletsAdmin(
      limit,
      offset,
      user,
    );

    return { data, totalWallets };
  }

  @Mutation(() => Wallet)
  async createWallet(@Context() context: any): Promise<Wallet> {
    const user = context.req.user; // 인증된 사용자 정보
    const wallet = await this.walletsService.createWallet(user); // 인증된 사용자 정보 전달
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
    //console.log('[DEBUG] Context:', context);

    const user = context.req?.user; // 인증된 사용자 정보 확인
    //console.log('[DEBUG] Extracted user:', user);

    if (!user) {
      console.error('[ERROR] User is not authenticated');
      throw new BadRequestException('User is not authenticated');
    }

    return this.walletsService.saveWithdrawAddress(user, newAddress, otp);
  }

  @Mutation(() => String, { description: 'Update wallet details' })
  async updateWallet(
    @Context() context: any,
    @Args('walletId') walletId: string,
    @Args('whithdrawAddress', { nullable: true }) whithdrawAddress?: string,
    @Args('usdtBalance', { nullable: true, type: () => Int })
    usdtBalance?: number,
  ): Promise<string> {
    const user = context.req.user;

    // 인증된 사용자 확인
    if (!user || !user.id) {
      throw new UnauthorizedException('User is not authenticated');
    }

    // 월렛 업데이트
    return this.walletsService.updateWalletDetails(user.id, walletId, {
      whithdrawAddress,
      usdtBalance,
    });
  }
}
