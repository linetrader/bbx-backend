// src/purchase-record/purchase-record.service.ts

import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PurchaseRecord } from './purchase-record.schema'; // PurchaseRecord 스키마 import
import { JwtService } from '@nestjs/jwt';
import { Wallet } from 'src/wallets/wallets.schema';
import { User } from 'src/users/users.schema';
import { Package } from 'src/package/package.schema';

@Injectable()
export class PurchaseRecordService {
  constructor(
    @InjectModel(PurchaseRecord.name)
    private readonly purchaseRecordModel: Model<PurchaseRecord>, // 올바른 주입
    @InjectModel(User.name)
    private readonly userModel: Model<User>, // 올바른 주입
    @InjectModel(Package.name)
    private readonly packageModel: Model<Package>, // 올바른 주입
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<Wallet>, // 누락된 의존성 추가
    private readonly jwtService: JwtService,
  ) {}

  // 구매 기록 생성
  async createPurchaseRecord(createRecordDto: {
    userId: string;
    packageName: string;
    quantity: number;
    totalPrice: number;
  }): Promise<PurchaseRecord> {
    const newRecord = new this.purchaseRecordModel(createRecordDto);
    return newRecord.save();
  }

  async purchasePackage(
    authHeader: string,
    packageId: string,
    quantity: number,
  ): Promise<string> {
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing.');
    }

    const token = authHeader.split(' ')[1];
    const decoded = this.jwtService.verify(token);
    const userId = decoded.id;

    // 1. 사용자의 지갑 확인
    const userWallet = await this.walletModel.findOne({ userId }).exec();
    if (!userWallet) {
      throw new BadRequestException('User wallet not found.');
    }

    // 2. 패키지 유효성 검사
    const selectedPackage = await this.packageModel.findById(packageId).exec();
    if (!selectedPackage) {
      throw new BadRequestException('Selected package not found.');
    }

    const totalPrice = selectedPackage.price * quantity;

    // 3. 결제 가능 여부 확인
    if (userWallet.usdtBalance < totalPrice) {
      throw new BadRequestException('Insufficient balance.');
    }

    // 4. 잔액 업데이트
    userWallet.usdtBalance -= totalPrice;
    await userWallet.save();

    // 5. 구매 기록 생성 요청
    await this.createPurchaseRecord({
      userId,
      packageName: selectedPackage.name,
      quantity,
      totalPrice,
    });

    return `Purchase of ${quantity} ${selectedPackage.name}(s) approved.`;
  }

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

  // 특정 사용자 구매 기록 조회
  async getPurchaseRecordsByUser(
    authHeader: string,
  ): Promise<PurchaseRecord[]> {
    const token = authHeader.split(' ')[1];
    const decoded = this.verifyToken(token);
    const userId = decoded.id;

    return this.purchaseRecordModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
  }
}
