// src/transaction/transaction.service.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction } from './transaction.schema';

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
  ) {}

  async getTransactionsByUser(
    user: { id: string },
    type?: string,
  ): Promise<Transaction[]> {
    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated');
    }

    const query: { userId: string; type?: string } = { userId: user.id };
    if (type) {
      query['type'] = type;
    }

    const transactions = await this.transactionModel
      .find(query)
      .sort({ createdAt: -1 })
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

  async checkTransactionHashExists(transactionHash: string): Promise<boolean> {
    const existingTransaction = await this.transactionModel
      .findOne({ transactionHash })
      .exec();
    return !!existingTransaction;
  }
}
