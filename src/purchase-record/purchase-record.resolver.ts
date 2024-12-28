// src/purchase-record/purchase-record.resolver.ts

import { Resolver, Query, Context, Mutation, Args, Int } from '@nestjs/graphql';
import { PurchaseRecord } from './purchase-record.schema';
import { PurchaseRecordService } from './purchase-record.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

@Resolver(() => PurchaseRecord)
export class PurchaseRecordResolver {
  constructor(private readonly purchaseRecordService: PurchaseRecordService) {}

  // 인증된 사용자의 모든 트랜잭션을 가져오는 쿼리
  @Query(() => [PurchaseRecord], {
    description: 'Fetch all transactions for the user',
  })
  async getPurchaseRecords(@Context() context: any): Promise<PurchaseRecord[]> {
    const authHeader = context.req.headers.authorization;

    const purchaseRecords =
      this.purchaseRecordService.getPurchaseRecordsByUser(authHeader);

    return purchaseRecords;
  }

  @Mutation(() => String)
  async purchasePackage(
    @Args('packageId', { type: () => String }) packageId: string,
    @Args('quantity', { type: () => Int }) quantity: number,
    @Context() context: any,
  ): Promise<string> {
    console.log('purchasePackage called with:', { packageId, quantity });

    try {
      // 인증 토큰 가져오기
      const authHeader = context.req.headers.authorization;

      if (!authHeader) {
        throw new UnauthorizedException('Authorization header is missing.');
      }

      console.log('Auth Header:', authHeader);

      // PurchaseRecordService를 통해 구매 로직 실행
      const result = await this.purchaseRecordService.purchasePackage(
        authHeader,
        packageId,
        quantity,
      );

      console.log('Purchase result:', result);

      return result;
    } catch (error) {
      // 에러 처리
      if (error instanceof BadRequestException) {
        console.error('BadRequestException:', error.message);
        throw error;
      } else if (error instanceof UnauthorizedException) {
        console.error('UnauthorizedException:', error.message);
        throw error;
      } else if (error instanceof Error) {
        console.error('General Error:', error.message);
        throw new Error('An unexpected error occurred.');
      } else {
        console.error('Unknown error:', error);
        throw new Error('An unknown error occurred.');
      }
    }
  }
}
