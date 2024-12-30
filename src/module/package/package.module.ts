// src/package/package.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PackageResolver } from './package.resolver';
import { PackageService } from './package.service';
import { Package, PackageSchema } from './package.schema';
import { Wallet, WalletSchema } from '../wallets/wallets.schema';
import {
  Transaction,
  TransactionSchema,
} from '../transaction/transaction.schema';
import { TransactionModule } from '../transaction/transaction.module';
import { UsersModule } from 'src/module/users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Package.name, schema: PackageSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    TransactionModule,
    UsersModule, // UsersModule 가져오기
  ],
  providers: [PackageResolver, PackageService],
  exports: [MongooseModule], // MongooseModule 내보내기 추가
})
export class PackageModule {}
