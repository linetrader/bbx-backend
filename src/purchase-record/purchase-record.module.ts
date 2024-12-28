// src/purchase-record/purchase-record.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PurchaseRecord, PurchaseRecordSchema } from './purchase-record.schema';
import { PurchaseRecordService } from './purchase-record.service';
import { PurchaseRecordResolver } from './purchase-record.resolver';
import { PackageModule } from 'src/package/package.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PurchaseRecord.name, schema: PurchaseRecordSchema },
    ]),
    PackageModule,
    UsersModule,
  ],
  providers: [PurchaseRecordService, PurchaseRecordResolver],
  exports: [PurchaseRecordService, MongooseModule], // MongooseModule 내보내기 추가
})
export class PurchaseRecordModule {}
