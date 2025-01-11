import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TotalMiningResolver } from './total-mining.resolver';
import { TotalMiningService } from './total-mining.service';
import { TotalMining, TotalMiningSchema } from './total-mining.schema';
import { PackageModule } from '../package/package.module';
import { CoinPriceModule } from '../coin-price/coin-price.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TotalMining.name, schema: TotalMiningSchema },
    ]),
    PackageModule,
    CoinPriceModule,
  ],
  providers: [TotalMiningResolver, TotalMiningService],
  exports: [TotalMiningService],
})
export class TotalMiningModule {}
