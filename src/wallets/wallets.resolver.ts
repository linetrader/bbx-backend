// src/wallet/wallet.resolver.ts

import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { WalletsService } from './wallets.service';

@Resolver()
export class WalletsResolver {
  constructor(private readonly walletService: WalletsService) {}

  @Mutation(() => String)
  async createWallet(@Args('userId') userId: string): Promise<string> {
    return this.walletService.createWallet(userId);
  }
}
