// src/module/monitoring/monitoring.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MonitoringResolver } from './monitoring.resolver';
import { MonitoringService } from './monitoring.service';
import { Monitoring, MonitoringSchema } from './monitoring.schema';
import { BscScanModule } from './bscscan/bscscan.module';
import { WalletsModule } from '../wallets/wallets.module'; // WalletsModule 가져오기
import { PackageUsersModule } from '../package-users/package-users.module';
import { TotalMiningModule } from '../total-mining/total-mining.module';
import { CoinPriceModule } from '../coin-price/coin-price.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Monitoring.name, schema: MonitoringSchema },
    ]),
    BscScanModule,
    WalletsModule,
    PackageUsersModule,
    TotalMiningModule,
    CoinPriceModule,
  ],
  providers: [MonitoringResolver, MonitoringService],
})
export class MonitoringModule {}
