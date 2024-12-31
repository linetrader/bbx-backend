// src/module/package/package-users.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PackageUsers, PackageUsersSchema } from './package-users.schema';
import { PackageUsersResolver } from './package-users.resolver';
import { PackageUsersService } from './package-users.service';
import { PackageModule } from '../package/package.module';
import { PackageRecordModule } from '../package-record/package-record.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PackageUsers.name, schema: PackageUsersSchema },
    ]),
    PackageModule,
    PackageRecordModule,
  ],
  providers: [PackageUsersResolver, PackageUsersService],
  exports: [PackageUsersService],
})
export class PackageUsersModule {}
