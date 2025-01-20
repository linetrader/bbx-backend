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
    const currencyMap: Record<string, string> = {
      en: 'USDT',
      ja: 'JPY',
      ko: 'KRW',
      zh: 'CNY',
    };

    const currency = currencyMap[language];
    if (!currency) {
      throw new BadRequestException('Invalid language');
    }

    try {
      const response = await axios.get(
        `https://min-api.cryptocompare.com/data/price?fsym=${coinName}&tsyms=${currency}`,
      );

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

    const existingCoinPrice = await this.coinPriceModel.findOne({
      coinName,
      language,
    });

    if (existingCoinPrice) {
      if (price) {
        existingCoinPrice.price = price;
      }
      existingCoinPrice.updatedAt = new Date();
      return existingCoinPrice.save();
    } else {
      const coinPrice = new this.coinPriceModel({
        coinName,
        language,
        price,
      });

      return coinPrice.save();
    }
  }

  async saveAllCoinPrices(): Promise<CoinPrice[]> {
    const coins = ['BTC', 'DOGE'];
    const languages = ['en', 'ja', 'ko', 'zh'];

    const savedPrices: CoinPrice[] = [];

    for (const coin of coins) {
      for (const language of languages) {
        const savedPrice = await this.saveCoinPrice(coin, language);
        savedPrices.push(savedPrice);
      }
    }

    return savedPrices;
  }

  async getCoinPrice(
    coinName: string,
    language: string,
  ): Promise<CoinPrice | null> {
    return this.coinPriceModel
      .findOne({ coinName, language })
      .sort({ createdAt: -1 });
  }
}
