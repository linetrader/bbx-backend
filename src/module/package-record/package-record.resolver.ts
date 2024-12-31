// src/purchase-record/purchase-record.resolver.ts

import { Resolver, Query, Context, Mutation, Args, Int } from '@nestjs/graphql';
import { PackageRecord } from './package-record.schema';
import { PackageRecordService } from './package-record.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

@Resolver(() => PackageRecord)
export class PurchaseRecordResolver {
  constructor(private readonly packageRecordService: PackageRecordService) {}

  // 인증된 사용자의 모든 트랜잭션을 가져오는 쿼리
  @Query(() => [PackageRecord], {
    description: 'Fetch all transactions for the user',
  })
  async getPackageRecords(@Context() context: any): Promise<PackageRecord[]> {
    const authHeader = context.req.headers.authorization;

    const purchaseRecords =
      this.packageRecordService.getPackageRecordsByUser(authHeader);

    return purchaseRecords;
  }
}
