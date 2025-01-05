// src/module/monitoring/monitoring.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MonitoringResolver } from './monitoring.resolver';
import { MonitoringService } from './monitoring.service';
import { Monitoring, MonitoringSchema } from './monitoring.schema';
import { BscScanModule } from './bscscan/bscscan.module';
import { WalletsModule } from '../wallets/wallets.module'; // WalletsModule 가져오기
import { PackageUsersModule } from '../package-users/package-users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Monitoring.name, schema: MonitoringSchema },
    ]),
    BscScanModule,
    WalletsModule, // WalletsModule을 MonitoringModule에 추가
    PackageUsersModule,
  ],
  providers: [MonitoringResolver, MonitoringService],
})
export class MonitoringModule {}
