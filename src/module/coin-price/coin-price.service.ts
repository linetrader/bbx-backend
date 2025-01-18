import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CoinPrice } from './coin-price.schema';
import axios from 'axios';

@Injectable()
export class CoinPriceService {
  constructor(
    @InjectModel(CoinPrice.name)
    private readonly coinPriceModel: Model<CoinPrice>,
  ) {}

  async fetchCoinPrice(coinName: string, language: string): Promise<number> {
    // 언어에 따른 통화 매핑
    const currencyMap: Record<string, string> = {
      en: 'USDT',
      ja: 'JPY',
      ko: 'KRW',
      zh: 'CNY',
    };

    const currency = currencyMap[language];
    if (!currency) {
      //throw new HttpException('Invalid language', HttpStatus.BAD_REQUEST);
      throw new BadRequestException('Invalid language');
    }

    try {
      // API 호출
      const response = await axios.get(
        `https://min-api.cryptocompare.com/data/price?fsym=${coinName}&tsyms=${currency}`,
      );

      //console.log('fetchCoinPrice - language', language);
      //console.log('fetchCoinPrice - coinName', coinName);
      //console.log('fetchCoinPrice - currency', currency);
      //console.log('fetchCoinPrice - price', response.data[currency]);

      return response.data[currency] || 0;
    } catch (error) {
      console.error(
        `Failed to fetch price for ${coinName} in ${currency}:`,
        error,
      );
      throw new BadRequestException('Failed to fetch coin price');
    }
  }

  async saveCoinPrice(coinName: string, language: string): Promise<CoinPrice> {
    const price = await this.fetchCoinPrice(coinName, language);

    // 기존 문서를 찾고 업데이트. 없으면 새로 생성하지 않음.
    const existingCoinPrice = await this.coinPriceModel.findOne({
      coinName,
      language,
    });

    //console.log('saveCoinPrice - ', existingCoinPrice);

    if (existingCoinPrice) {
      //console.log('saveCoinPrice 업데이트 - ');
      // 기존 문서 업데이트
      if (price) {
        existingCoinPrice.price = price;
      }
      existingCoinPrice.updatedAt = new Date(); // 타임스탬프 갱신
      return existingCoinPrice.save();
    } else {
      //console.log('saveCoinPrice 생성 - ');
      // 새 문서 생성
      const coinPrice = new this.coinPriceModel({
        coinName,
        language,
        price,
      });

      return coinPrice.save();
    }
  }

  // **새로운 함수: 2개의 코인과 4개의 국가별 가격 저장**
  async saveAllCoinPrices(): Promise<CoinPrice[]> {
    const coins = ['BTC', 'DOGE']; // 코인 목록
    const languages = ['en', 'ja', 'ko', 'zh']; // 언어별 통화 매핑

    const savedPrices: CoinPrice[] = [];

    for (const coin of coins) {
      for (const language of languages) {
        // 기존 데이터 업데이트 또는 없을 때 생성
        const savedPrice = await this.saveCoinPrice(coin, language);
        savedPrices.push(savedPrice); // 결과 저장
      }
    }

    return savedPrices;
  }

  async getCoinPrice(
    coinName: string,
    language: string,
  ): Promise<CoinPrice | null> {
    //console.log('getCoinPrice - coinName', coinName);
    //console.log('getCoinPrice - language', language);
    return this.coinPriceModel
      .findOne({ coinName, language })
      .sort({ createdAt: -1 });
  }
}
