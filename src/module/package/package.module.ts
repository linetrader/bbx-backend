// src/package/package.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PackageResolver } from './package.resolver';
import { PackageService } from './package.service';
import { Package, PackageSchema } from './package.schema';
import { TransactionModule } from '../transaction/transaction.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Package.name, schema: PackageSchema }]),
    TransactionModule,
    UsersModule, // UsersModule 가져오기
  ],
  providers: [PackageResolver, PackageService],
  exports: [PackageService],
})
export class PackageModule {}
