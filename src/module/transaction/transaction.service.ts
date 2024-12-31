// src/transaction/transaction.service.ts

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction } from './transaction.schema';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
    private readonly jwtService: JwtService,
  ) {}

  async getTransactionsByUser(authHeader: string): Promise<Transaction[]> {
    const token = authHeader.split(' ')[1];
    const decoded = this.jwtService.verify(token);
    const userId = decoded.id;

    // 사용자 ID로 트랜잭션 조회 및 반환
    const transactions = await this.transactionModel
      .find({ userId: userId })
      .sort({ createdAt: -1 }) // 최신순 정렬
      .exec();

    // createdAt 확인을 위해 출력
    // transactions.forEach((transaction) => {
    //   console.log(
    //     `Transaction ID: ${transaction.id}, Created At: ${transaction.createdAt}`,
    //   );
    // });

    return transactions;
  }

  async createTransaction(data: {
    type: string;
    amount: number;
    token: string;
    transactionHash: string;
    userId: string;
    walletId: string;
  }): Promise<void> {
    const transaction = new this.transactionModel(data);
    await transaction.save();
  }

  // 새로운 함수 추가: 특정 트랜잭션 해시 존재 여부 확인
  async checkTransactionHashExists(transactionHash: string): Promise<boolean> {
    const existingTransaction = await this.transactionModel
      .findOne({ transactionHash })
      .exec();
    return !!existingTransaction; // 존재하면 true, 없으면 false
  }
}
