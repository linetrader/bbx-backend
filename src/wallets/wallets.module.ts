// src/wallets/wallets.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletsService } from './wallets.service';
import { WalletsResolver } from './wallets.resolver';
import { Wallet, WalletSchema } from './wallets.schema';
import { User, UserSchema } from '../users/users.schema';
import { WalletsGateway } from './wallets.gateway';
import { TransactionModule } from 'src/transaction/transaction.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: User.name, schema: UserSchema },
    ]),
    TransactionModule,
  ],
  providers: [WalletsService, WalletsResolver, WalletsGateway],
  exports: [MongooseModule], // WalletModel 내보내기
})
export class WalletsModule {}
