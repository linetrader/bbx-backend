import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CoinPrice, CoinPriceSchema } from './coin-price.schema';
import { CoinPriceService } from './coin-price.service';
import { CoinPriceResolver } from './coin-price.resolver';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CoinPrice.name, schema: CoinPriceSchema }, // 모델 등록
    ]),
  ],
  providers: [CoinPriceService, CoinPriceResolver], // 서비스와 리졸버 등록
  exports: [CoinPriceService], // 필요한 경우 서비스 내보내기
})
export class CoinPriceModule {}
