// src/package-record/package-record.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PackageRecord, PackageRecordSchema } from './package-record.schema';
import { PackageRecordService } from './package-record.service';
import { PurchaseRecordResolver } from './package-record.resolver';
import { UsersModule } from 'src/module/users/users.module';
import { PackageModule } from 'src/module/package/package.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PackageRecord.name, schema: PackageRecordSchema },
    ]),
    PackageModule,
    UsersModule,
  ],
  providers: [PackageRecordService, PurchaseRecordResolver],
  exports: [PackageRecordService, MongooseModule], // MongooseModule 내보내기 추가
})
export class PackageRecordModule {}
