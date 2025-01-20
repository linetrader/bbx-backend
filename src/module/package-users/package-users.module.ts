// src/module/package/package-users.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PackageUsers, PackageUsersSchema } from './package-users.schema';
import { PackageUsersResolver } from './package-users.resolver';
import { PackageUsersService } from './package-users.service';
import { PackageModule } from '../package/package.module';
import { WalletsModule } from '../wallets/wallets.module';
import { ContractsModule } from '../contracts/contracts.module';
import { MiningLogsModule } from '../mining-logs/mining-logs.module';
import { UsersModule } from '../users/users.module';
import { TokenTransferModule } from '../token-transfer/token-transfer.module';
import { ReferrerUsersModule } from '../referrer-users/referrer-users.module';
import { CoinPriceModule } from '../coin-price/coin-price.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PackageUsers.name, schema: PackageUsersSchema },
    ]),
    WalletsModule,
    PackageModule,
    ContractsModule,
    MiningLogsModule,
    UsersModule,
    TokenTransferModule,
    ReferrerUsersModule,
    CoinPriceModule,
  ],
  providers: [PackageUsersResolver, PackageUsersService],
  exports: [PackageUsersService],
})
export class PackageUsersModule {}
