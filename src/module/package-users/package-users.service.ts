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
import { JwtService } from '@nestjs/jwt';
import { Wallet } from '../wallets/wallets.schema';
import { ContractsService } from '../contracts/contracts.service';

@Injectable()
export class PackageUsersService implements OnModuleInit {
  constructor(
    @InjectModel(PackageUsers.name)
    private readonly packageUsersModel: Model<PackageUsers>,
    @InjectModel(Package.name)
    private readonly packageModel: Model<Package>,
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<Wallet>,
    private readonly contractsService: ContractsService,
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
      const packageUsers = await this.packageUsersModel
        .find({ packageType: name })
        .exec();

      for (const packageUser of packageUsers) {
        try {
          const totalProfit = miningProfit * packageUser.quantity;

          packageUser.miningBalance += totalProfit;
          await packageUser.save();
        } catch (error) {
          console.error(
            `Error during mining for user: ${packageUser.userId}:`,
            error,
          );
        }
      }
    }, miningInterval * 1000); // miningInterval 단위를 초로 변환
  }

  // 모든 패키지에 대해 마이닝 시작
  async startMiningForAllPackages(): Promise<void> {
    const allPackages = await this.packageModel.find({ status: 'show' }).exec();

    for (const pkg of allPackages) {
      if (pkg.miningInterval && pkg.miningProfit) {
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

  private async getWallet(userId: string): Promise<Wallet> {
    const wallet = await this.walletModel.findOne({ userId }).exec();
    if (!wallet) {
      throw new BadRequestException('Wallet not found for the user.');
    }
    return wallet;
  }

  private async getPackage(packageId: string): Promise<Package> {
    const selectedPackage = await this.packageModel.findById(packageId).exec();
    if (!selectedPackage) {
      throw new BadRequestException('Selected package not found.');
    }
    return selectedPackage;
  }

  private checkSufficientBalance(
    balance: number,
    price: number,
    quantity: number,
  ): void {
    const totalPrice = price * quantity;
    if (totalPrice > balance) {
      throw new BadRequestException('Insufficient balance.');
    }
  }

  private async updateUserPackage(
    userId: string,
    packageName: string,
    walletId: string,
    quantity: number,
  ): Promise<void> {
    const userPackage = await this.packageUsersModel.findOne({
      userId,
      packageType: packageName,
    });

    if (userPackage) {
      userPackage.quantity += quantity;
      await userPackage.save();
    } else {
      const newUserPackage = new this.packageUsersModel({
        userId,
        walletId,
        packageType: packageName,
        quantity,
        miningBalance: 0.0,
      });
      await newUserPackage.save();
    }
  }

  private async createContract(
    customerName: string,
    customerPhone: string,
    customerAddress: string,
    userId: string,
    packageName: string,
    quantity: number,
    totalPrice: number,
  ): Promise<boolean> {
    return this.contractsService.createContract({
      customerName,
      customerPhone,
      customerAddress,
      userId,
      packageName,
      quantity,
      totalPrice,
    });
  }

  private async deductWalletBalance(
    wallet: Wallet,
    totalPrice: number,
  ): Promise<void> {
    wallet.usdtBalance -= totalPrice;
    await wallet.save();
  }

  async purchasePackage(
    user: { id: string }, // 인증된 사용자 정보
    packageId: string,
    quantity: number,
    customerName: string,
    customerPhone: string,
    customerAddress: string,
  ): Promise<string> {
    try {
      if (!user || !user.id) {
        throw new UnauthorizedException('User is not authenticated');
      }

      // 1. 사용자 지갑 가져오기
      const myWallet = await this.getWallet(user.id);

      // 2. 패키지 정보 가져오기
      const selectedPackage = await this.getPackage(packageId);

      // 3. 잔액 확인
      this.checkSufficientBalance(
        myWallet.usdtBalance,
        selectedPackage.price,
        quantity,
      );

      const totalPrice = selectedPackage.price * quantity;

      // 4. 계약서 생성
      const contractCreated = await this.createContract(
        customerName,
        customerPhone,
        customerAddress,
        user.id,
        selectedPackage.name,
        quantity,
        totalPrice,
      );

      if (!contractCreated) {
        throw new BadRequestException('Failed to create contract.');
      }

      // 5. 사용자 패키지 업데이트
      await this.updateUserPackage(
        user.id,
        selectedPackage.name,
        myWallet.id,
        quantity,
      );

      // 6. 지갑 잔액 차감
      await this.deductWalletBalance(myWallet, totalPrice);

      return `Successfully purchased ${quantity} of ${selectedPackage.name}.`;
    } catch (error) {
      const err =
        error && typeof error === 'object' && 'message' in error ? error : '';
      throw new BadRequestException(err);
    }
  }

  // 3. 특정 유저의 패키지 마이닝 수량 조회
  async getUserPackages(user: { id: string }): Promise<PackageUsers[] | null> {
    try {
      if (!user || !user.id) {
        throw new UnauthorizedException('User is not authenticated');
      }

      const packageUsers = await this.packageUsersModel
        .find({ userId: user.id })
        .exec();
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

    return true;
  }
}
