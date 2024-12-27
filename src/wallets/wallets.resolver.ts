// src/wallets/wallets.resolver.ts

import { Resolver, Mutation, Query, Context } from '@nestjs/graphql';
import { WalletsService } from './wallets.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Wallet } from './wallets.schema';

@Resolver()
export class WalletsResolver {
  constructor(private readonly walletService: WalletsService) {}

  @Query(() => Wallet)
  async getWalletInfo(@Context() context: any): Promise<Wallet> {
    const authHeader = context.req.headers.authorization;
    //console.log('WalletsResolver - getWalletInfo:', authHeader);

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing.');
    }

    const wallet = await this.walletService.getWalletInfo(authHeader);
    if (!wallet) {
      throw new BadRequestException('Wallet not found.');
    }

    //console.log('Wallet fetched successfully:', wallet);
    return wallet;
  }

  @Query(() => String, { nullable: true })
  async getWalletAddress(@Context() context: any): Promise<string | null> {
    //console.log('Fetching wallet address for userId:', userId);
    // Optional: Fetch the wallet address directly
    const userId = context.req.user?.id;
    const walletAddress = await this.walletService.getWalletAddress(userId);
    if (!walletAddress) {
      throw new BadRequestException('Wallet not found for this user');
    }

    //console.log('Wallet found:', walletAddress);
    return walletAddress;
  }

  @Mutation(() => Wallet)
  async createWallet(@Context() context: any): Promise<Wallet> {
    const authHeader = context.req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing.');
    }

    const wallet = await this.walletService.createWallet(
      authHeader,
      context.req.user,
    );
    if (!wallet) {
      throw new BadRequestException('Failed to create wallet.');
    }

    return wallet;
  }
}
