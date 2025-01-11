import { Args, Context, Query, Resolver } from '@nestjs/graphql';
import { CoinPriceService } from './coin-price.service';
import { CoinPrice } from './coin-price.schema';
import { UnauthorizedException } from '@nestjs/common';

@Resolver()
export class CoinPriceResolver {
  constructor(private readonly coinPriceService: CoinPriceService) {}

  // 코인 가격 조회 (Query)
  @Query(() => CoinPrice, { nullable: true })
  async getCoinPrice(
    @Args('coinName') coinName: string,
    @Args('language') language: string,
    @Context() context: any,
  ): Promise<CoinPrice | null> {
    const user = context.req.user; // 인증된 사용자 정보
    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated.');
    }

    return this.coinPriceService.getCoinPrice(coinName, language, user.id);
  }
}
