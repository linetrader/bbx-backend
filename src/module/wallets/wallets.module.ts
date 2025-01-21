// src/wallets/wallets.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletsService } from './wallets.service';
import { WalletsResolver } from './wallets.resolver';
import { Wallet, WalletSchema } from './wallets.schema';
import { WalletsGateway } from './wallets.gateway';
import { TransactionModule } from 'src/module/transaction/transaction.module';
import { GoogleOTPModule } from 'src/module/google-otp/google-otp.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Wallet.name, schema: WalletSchema }]),
    TransactionModule,
    GoogleOTPModule,
    UsersModule,
  ],
  providers: [WalletsService, WalletsResolver, WalletsGateway],
  exports: [WalletsService],
})
export class WalletsModule {}
