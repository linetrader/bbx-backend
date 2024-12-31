// src/package-record/package-record.service.ts

import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PackageRecord } from './package-record.schema'; // PackageRecord 스키마 import
import { JwtService } from '@nestjs/jwt';
import { Wallet } from 'src/module/wallets/wallets.schema';
import { User } from 'src/module/users/users.schema';
import { Package } from 'src/module/package/package.schema';

@Injectable()
export class PackageRecordService {
  constructor(
    @InjectModel(PackageRecord.name)
    private readonly packageRecordModel: Model<PackageRecord>, // 올바른 주입
    @InjectModel(User.name)
    private readonly userModel: Model<User>, // 올바른 주입
    @InjectModel(Package.name)
    private readonly packageModel: Model<Package>, // 올바른 주입
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<Wallet>, // 누락된 의존성 추가
    private readonly jwtService: JwtService,
  ) {}

  // 구매 기록 생성
  async createPackageRecord(createRecordDto: {
    userId: string;
    packageName: string;
    quantity: number;
    totalPrice: number;
  }): Promise<PackageRecord> {
    const newRecord = new this.packageRecordModel(createRecordDto);
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
    await this.createPackageRecord({
      userId,
      packageName: selectedPackage.name,
      quantity,
      totalPrice,
    });

    return `Package of ${quantity} ${selectedPackage.name}(s) approved.`;
  }

  // 특정 사용자 구매 기록 조회
  async getPackageRecordsByUser(authHeader: string): Promise<PackageRecord[]> {
    try {
      // 헤더 확인
      if (!authHeader) {
        throw new UnauthorizedException('Authorization header is missing.');
      }
      const token = authHeader.split(' ')[1];
      if (!token) {
        throw new UnauthorizedException('Bearer token is missing.');
      }

      const decoded = this.jwtService.verify(token);
      const userId = decoded.id;
      // 유저 확인
      if (!userId) {
        throw new UnauthorizedException('User ID is missing in token.');
      }

      const packages = this.packageRecordModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .exec();

      if (!packages) {
        throw new BadRequestException('Packages not found.');
      }

      return packages;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }
}