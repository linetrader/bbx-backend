// src/transaction/transaction.service.ts

import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
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

  verifyToken(token: string): { id: string; email: string } {
    try {
      return this.jwtService.verify(token) as { id: string; email: string };
    } catch (error) {
      const err = error as Error;
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedException(
          'Token has expired. Please log in again.',
        );
      }
      throw new BadRequestException('Invalid token.');
    }
  }

  async getTransactionsByUser(authHeader: string): Promise<Transaction[]> {
    const token = authHeader.split(' ')[1];
    const decoded = this.verifyToken(token);
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
}
