// src/module/package/package-users.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PackageUsers, PackageUsersSchema } from './package-users.schema';
import { PackageUsersResolver } from './package-users.resolver';
import { PackageUsersService } from './package-users.service';
import { PackageModule } from '../package/package.module';
//import { PackageRecordModule } from '../package-record/package-record.module';
import { WalletsModule } from '../wallets/wallets.module';
import { ContractsModule } from '../contracts/contracts.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PackageUsers.name, schema: PackageUsersSchema },
    ]),
    WalletsModule,
    PackageModule,
    ContractsModule,
    //PackageRecordModule,
  ],
  providers: [PackageUsersResolver, PackageUsersService],
  exports: [MongooseModule, PackageUsersService], // MongooseModule을 exports에 추가
})
export class PackageUsersModule {}
