// src/module/package/package-users.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PackageUsers, PackageUsersSchema } from './package-users.schema';
import { PackageUsersResolver } from './package-users.resolver';
import { PackageUsersService } from './package-users.service';
import { PackageModule } from '../package/package.module';
import { WalletsModule } from '../wallets/wallets.module';
import { ContractsModule } from '../contracts/contracts.module';
import { MiningLogsModule } from '../mining-logs/mining-logs.module'; // Import MiningLogsModule
import { UsersModule } from '../users/users.module';
import { TokenTransferModule } from '../token-transfer/token-transfer.module';

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
  ],
  providers: [PackageUsersResolver, PackageUsersService],
  exports: [PackageUsersService], // MongooseModule을 exports에 추가
})
export class PackageUsersModule {}
