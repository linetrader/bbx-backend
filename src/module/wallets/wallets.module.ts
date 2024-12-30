// src/wallets/wallets.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletsService } from './wallets.service';
import { WalletsResolver } from './wallets.resolver';
import { Wallet, WalletSchema } from './wallets.schema';
import { WalletsGateway } from './wallets.gateway';
import { TransactionModule } from 'src/module/transaction/transaction.module';
import { GoogleOTPModule } from 'src/module/google-otp/google-otp.module';
import { User, UserSchema } from '../users/users.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: User.name, schema: UserSchema },
    ]),
    TransactionModule,
    GoogleOTPModule,
  ],
  providers: [WalletsService, WalletsResolver, WalletsGateway],
  exports: [MongooseModule, WalletsService], // WalletModel 내보내기
})
export class WalletsModule {}
