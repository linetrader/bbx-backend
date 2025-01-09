// contracts.resolver.ts

import { Resolver, Query, Context, Args } from '@nestjs/graphql';
import { ContractsService } from './contracts.service';
import { DefaultContractTemplate, Contract } from './contracts.schema';
import { UnauthorizedException } from '@nestjs/common';

@Resolver()
export class ContractsResolver {
  constructor(private readonly contractsService: ContractsService) {}

  @Query(() => DefaultContractTemplate)
  async getDefaultContract(
    @Context() context: any,
  ): Promise<DefaultContractTemplate> {
    // 인증된 사용자는 req.user에 정보가 담겨 있음
    const user = context.req.user;

    if (!user || !user.id) {
      throw new UnauthorizedException('User is not authenticated');
    }

    const defaultContract = await this.contractsService.getDefaultContract();

    return {
      content: defaultContract.content,
      date: new Date().toISOString().split('T')[0],
      companyName: defaultContract.companyName,
      companyAddress: defaultContract.companyAddress,
      businessNumber: defaultContract.businessNumber,
      representative: defaultContract.representative,
    };
  }

  // 인증된 사용자의 모든 계약을 가져오는 쿼리
  @Query(() => [Contract], {
    description:
      'Fetch all contracts for the user with an optional status filter',
  })
  async getPackageRecords(
    @Args('status', { type: () => String, defaultValue: 'approved' })
    status: string, // 기본값: 'approved'
    @Context() context: any,
  ): Promise<Contract[]> {
    const user = context.req.user; // 인증된 사용자 정보
    return await this.contractsService.getPackageRecordsByUser(user, status);
  }
}
