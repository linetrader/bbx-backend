// src/transaction/transaction.resolver.ts

import { Resolver, Query, Context } from '@nestjs/graphql';
import { TransactionService } from './transaction.service';
import { Transaction } from './transaction.schema';

@Resolver()
export class TransactionResolver {
  constructor(private readonly transactionService: TransactionService) {}

  // 인증된 사용자의 모든 트랜잭션을 가져오는 쿼리
  @Query(() => [Transaction], {
    description: 'Fetch all transactions for the user',
  })
  async getTransactionList(@Context() context: any): Promise<Transaction[]> {
    const user = context.req.user; // 인증된 사용자 정보
    return await this.transactionService.getTransactionsByUser(user); // 인증된 사용자 정보 전달
  }
}
