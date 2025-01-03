// src/transaction/transaction.service.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction } from './transaction.schema';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
  ) {}

  async getTransactionsByUser(user: { id: string }): Promise<Transaction[]> {
    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated');
    }

    const transactions = await this.transactionModel
      .find({ userId: user.id })
      .sort({ createdAt: -1 }) // 최신순 정렬
      .exec();

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

  // 특정 트랜잭션 해시 존재 여부 확인
  async checkTransactionHashExists(transactionHash: string): Promise<boolean> {
    const existingTransaction = await this.transactionModel
      .findOne({ transactionHash })
      .exec();
    return !!existingTransaction; // 존재하면 true, 없으면 false
  }
}
