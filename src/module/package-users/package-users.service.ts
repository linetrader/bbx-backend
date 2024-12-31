// src/module/package/package-users.service.ts

import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PackageUsers } from './package-users.schema';
import { Package } from '../package/package.schema';
import { PackageRecordService } from '../package-record/package-record.service';
import { JwtService } from '@nestjs/jwt';
import { Wallet } from '../wallets/wallets.schema';

@Injectable()
export class PackageUsersService implements OnModuleInit {
  constructor(
    @InjectModel(PackageUsers.name)
    private readonly packageUsersModel: Model<PackageUsers>,
    @InjectModel(Package.name)
    private readonly packageModel: Model<Package>,
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<Wallet>,
    private readonly packageRecordService: PackageRecordService,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    console.log('Starting mining process for active packages...');
    this.startMiningForAllPackages();
  }

  // 특정 상품에 대한 마이닝 실행
  async startMiningForPackage(
    name: string,
    miningInterval: number,
    miningProfit: number,
  ): Promise<void> {
    setInterval(async () => {
      console.log(`Starting mining for package: ${name}`);

      // 상품 유형이 `name`인 모든 PackageUsers 가져오기
      const packageUsers = await this.packageUsersModel
        .find({ packageType: name })
        .exec();

      for (const packageUser of packageUsers) {
        try {
          // 상품 수량에 따른 수익 계산
          const totalProfit = miningProfit * packageUser.quantity;

          // 수량 업데이트
          packageUser.miningBalance += totalProfit;
          await packageUser.save();

          console.log(
            `User ${packageUser.userId} mined ${totalProfit} (${miningProfit} x ${packageUser.quantity}) of ${name}. Total balance: ${packageUser.miningBalance}`,
          );
        } catch (error) {
          console.error(
            `Error during mining for user ${packageUser.userId}:`,
            error,
          );
        }
      }
    }, miningInterval * 1000); // miningInterval 단위를 초로 변환
  }

  // 모든 패키지에 대해 마이닝 시작
  async startMiningForAllPackages(): Promise<void> {
    // packageModel에서 모든 패키지 가져오기
    const allPackages = await this.packageModel.find({ status: 'show' }).exec();

    for (const pkg of allPackages) {
      if (pkg.miningInterval && pkg.miningProfit) {
        // 각 패키지별로 마이닝 시작
        this.startMiningForPackage(
          pkg.name,
          pkg.miningInterval,
          pkg.miningProfit,
        );
      } else {
        console.warn(
          `Package ${pkg.name} does not have valid miningInterval or miningProfit.`,
        );
      }
    }
  }

  // 1. 패키지 구매 및 수량 업데이트
  async purchasePackage(
    authHeader: string,
    packageId: string,
    quantity: number,
  ): Promise<string> {
    try {
      if (!authHeader) {
        throw new UnauthorizedException('Authorization header is missing.');
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        throw new UnauthorizedException('Bearer token is missing.');
      }

      // 1. userId 추출
      const decoded = this.jwtService.verify(token); // JWT 토큰 검증
      const userId = decoded.id;
      if (!userId) {
        throw new UnauthorizedException('User not found.');
      }

      //console.log(userId);

      // 월렛 검색
      const myWallet = await this.walletModel.findOne({ userId }).exec();
      if (!myWallet) {
        throw new BadRequestException('Wallet not found for the user.');
      }

      //console.log(myWallet);

      // 2. 패키지 조회
      const selectedPackage = await this.packageModel
        .findById(packageId)
        .exec();

      if (!selectedPackage) {
        throw new BadRequestException('Selected package not found.');
      }

      const totalPrice = selectedPackage.price * quantity;

      console.log(
        'totalPrice : ',
        totalPrice,
        'myWallet.usdtBalance : ',
        myWallet.usdtBalance,
      );

      // 내 밸런스보다 큰지 체크한다.
      if (totalPrice > myWallet.usdtBalance) {
        throw new BadRequestException('Insufficient balance.');
      }

      // 3. PackageUsers 데이터 업데이트
      const userPackage = await this.packageUsersModel.findOne({
        userId,
        packageType: selectedPackage.name,
      });

      if (userPackage) {
        userPackage.quantity += quantity;
        await userPackage.save();
      } else {
        const newUserPackage = new this.packageUsersModel({
          userId,
          walletId: myWallet.id,
          packageType: selectedPackage.name,
          quantity,
          miningBalance: 0.0,
        });
        await newUserPackage.save();
      }

      // 4. 구매 기록 생성
      await this.packageRecordService.createPackageRecord({
        userId,
        packageName: selectedPackage.name,
        quantity,
        totalPrice,
      });

      return `Successfully purchased ${quantity} of ${selectedPackage.name}.`;
    } catch (error) {
      const err =
        error && typeof error === 'object' && 'message' in error ? error : '';
      throw new BadRequestException(err);
    }
  }

  // 3. 특정 유저의 패키지 마이닝 수량 조회
  async getUserPackages(authHeader: string): Promise<PackageUsers[] | null> {
    try {
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

      const packageUsers = this.packageUsersModel.find({ userId }).exec();
      if (!packageUsers) {
        throw new UnauthorizedException('packageUsers not found.');
      }

      return packageUsers;
    } catch (error) {
      throw new UnauthorizedException(`{error.message}`);
    }
  }

  // 지갑 및 코인 차감
  async adjustBalance(
    userId: string,
    currency: string,
    amount: number,
  ): Promise<boolean> {
    // 잔액 업데이트
    if (currency === 'USDT') {
      const wallet = await this.walletModel.findOne({ userId }).exec();
      if (!wallet) {
        return false;
      }

      if (wallet.usdtBalance > amount) {
        wallet.usdtBalance = wallet.usdtBalance - amount;
        await wallet.save();
      }
    } else if (currency === 'BTC' || currency === 'DOGE') {
      const myPackage = await this.packageUsersModel.findOne({
        userId,
        currency,
      });
      if (!myPackage) {
        return false;
      }
      if (myPackage.miningBalance > amount) {
        myPackage.miningBalance = myPackage.miningBalance - amount;
        await myPackage.save();
      }
    } else {
      return false;
    }

    // console.log(
    //   'adjustBalance - token, amount, wallet.usdtBalance : ',
    //   token,
    //   amount,
    //   wallet.usdtBalance,
    // );

    return true;
  }
}
