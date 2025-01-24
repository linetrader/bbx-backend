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
import { ContractsService } from '../contracts/contracts.service';
import { MiningLogsService } from '../mining-logs/mining-logs.service'; // Import MiningLogsService
import { WalletsService } from '../wallets/wallets.service';
import { Wallet } from '../wallets/wallets.schema';
import { PackageService } from '../package/package.service';
import { GetMiningCustomerResponse } from './dto/package-users.dto';
import { UsersService } from '../users/users.service';
import { TokenTransferService } from '../token-transfer/token-transfer.service';
import { ReferrerUsersService } from '../referrer-users/referrer-users.service';
import { CoinPriceService } from '../coin-price/coin-price.service';
import { checkAdminAccess, checkUserAuthentication } from '../../utils/utils';

@Injectable()
export class PackageUsersService implements OnModuleInit {
  private packageData: Record<
    string,
    { name: string; miningProfit: number; logInterval: number }
  > = {};

  constructor(
    @InjectModel(PackageUsers.name)
    private readonly packageUsersModel: Model<PackageUsers>,
    private readonly packageService: PackageService,
    private readonly walletsService: WalletsService,
    private readonly contractsService: ContractsService,
    private readonly miningLogsService: MiningLogsService,
    private readonly usersService: UsersService,
    private readonly tokenTransferService: TokenTransferService,
    private readonly referrerUsersService: ReferrerUsersService,
    private readonly coinPriceService: CoinPriceService,
  ) {}

  async onModuleInit() {
    await this.initialMiningForAllPackages();
    await this.initialPacakageUsers();
  }

  private async initialPacakageUsers(): Promise<void> {
    const approvedContracts =
      await this.contractsService.getApprovedContracts();
    // approvedContracts를 사용하여 필요한 로직을 추가합니다.
    if (approvedContracts) {
      for (const contract of approvedContracts) {
        await this.updateUserPackage(
          contract.userId,
          contract.packageName,
          contract.quantity,
        );
      }
    }

    const packageUsers = await this.packageUsersModel.find().exec();
    for (const packageUser of packageUsers) {
      const userContracts = approvedContracts.filter(
        (contract) =>
          contract.userId === packageUser.userId &&
          contract.packageName === packageUser.packageType,
      );
      const totalContractQuantity = userContracts.reduce(
        (sum, contract) => sum + contract.quantity,
        0,
      );

      if (packageUser.quantity !== totalContractQuantity) {
        packageUser.quantity = totalContractQuantity;
        await packageUser.save();
      }
    }
  }

  async getMiningCustomers(
    limit: number,
    offset: number,
    user: { id: string },
  ): Promise<{ data: GetMiningCustomerResponse[]; totalCustomers: number }> {
    const isSuperUser = await this.usersService.isValidSuperUser(user.id);

    let userIds: string[];
    if (isSuperUser) {
      userIds = await this.usersService.getAllUserIds();
    } else {
      await checkAdminAccess(this.usersService, user.id);
      userIds = await this.usersService.getUserIdsUnderMyNetwork(user.id);
    }

    const packageUsers = await this.packageUsersModel
      .find({ userId: { $in: userIds } })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .exec();

    const totalCustomers = await this.packageUsersModel
      .countDocuments({ userId: { $in: userIds } })
      .exec();

    const data = await Promise.all(
      packageUsers.map(async (user) => {
        const username = await this.usersService.getUserName(user.userId);
        return {
          id: user.id,
          username: username || 'Unknown',
          packageType: user.packageType,
          quantity: user.quantity,
          miningBalance: user.miningBalance,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };
      }),
    );

    return { data, totalCustomers };
  }

  async initialMiningForAllPackages(): Promise<void> {
    const allPackages = await this.packageService.findShow();

    for (const pkg of allPackages) {
      if (pkg.miningProfit) {
        this.packageData[pkg.name] = {
          name: pkg.name,
          miningProfit: pkg.miningProfit,
          logInterval: pkg.logInterval,
        };
      } else {
        console.warn(`Package ${pkg.name} does not have valid miningProfit.`);
      }
    }
  }

  async startMiningForPackage(miningInterval: number): Promise<void> {
    for (const packageName in this.packageData) {
      const { name, miningProfit, logInterval } = this.packageData[packageName];
      const nowProfit = (miningProfit / (24 * 60 * 60)) * miningInterval;

      const packageUsers = await this.packageUsersModel
        .find({ packageType: name })
        .exec();

      for (const packageUser of packageUsers) {
        try {
          const totalProfit = parseFloat(
            (nowProfit * packageUser.quantity).toFixed(6),
          );

          packageUser.miningBalance += totalProfit;
          await packageUser.save();

          await this.miningLogsService.recordMiningLog(
            packageUser.userId,
            packageUser.packageType,
            totalProfit,
            logInterval,
          );
        } catch (error) {
          console.error(
            `Error during mining for user: ${packageUser.userId} and package ${name}:`,
            error,
          );
        }
      }
    }
  }

  private async getWallet(userId: string): Promise<Wallet> {
    const wallet = await this.walletsService.findWalletById(userId);
    if (!wallet) {
      throw new BadRequestException('Wallet not found for the user.');
    }
    return wallet;
  }

  private async getPackage(packageId: string): Promise<Package> {
    const selectedPackage =
      await this.packageService.findPackageById(packageId);
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
    quantity: number,
  ): Promise<void> {
    let userPackage = await this.packageUsersModel.findOne({
      userId,
      packageType: packageName,
    });
    const referrer =
      (await this.usersService.findMyReferrerById(userId)) || 'linetrader';
    const leaderName =
      (await this.findMiningGroupLeaderName(referrer, packageName)) ||
      'linetrader';

    if (userPackage) {
      userPackage.groupLeaderName = leaderName;
      userPackage.referrerUserName = referrer;
      userPackage.quantity += quantity;
    } else {
      userPackage = new this.packageUsersModel({
        userId,
        groupLeaderName: leaderName,
        referrerUserName: referrer,
        packageType: packageName,
        quantity: quantity,
        miningBalance: 0.0,
      });
    }
    await userPackage.save();
  }

  private async findMiningGroupLeaderName(
    inUserName: string,
    packageType: string,
  ): Promise<string | null> {
    try {
      const leaderName = await this.referrerUsersService.getGroupLeaderName(
        inUserName,
        packageType,
      );

      if (leaderName) {
        return leaderName;
      }

      const referrerUserName =
        await this.usersService.findMyReferrer(inUserName);

      if (!referrerUserName) {
        return null;
      }

      return this.findMiningGroupLeaderName(referrerUserName, packageType);
    } catch (error) {
      console.error('[ERROR] Failed to find mining group leader name:', error);
      throw new BadRequestException('Failed to find mining group leader name.');
    }
  }

  async confirmPackage(
    contractId: string,
    username: string,
    packageName: string,
    quantity: number,
    userId: string,
  ): Promise<boolean> {
    const requestingUser = await this.usersService.isValidSuperUser(userId);
    if (!requestingUser) {
      throw new BadRequestException(
        'Unauthorized: Access is restricted to admins only.',
      );
    }

    const findUserId = await this.usersService.findUserIdByUsername(username);
    if (!findUserId) {
      return false;
    }

    const packagePrice = await this.packageService.getPackagePrice(packageName);
    const totalPrice = packagePrice * quantity;

    const isContract = await this.contractsService.confirmContract(contractId);
    if (!isContract) {
      throw new BadRequestException('계약서가 없습니다.');
    }

    await this.updateUserPackage(findUserId, packageName, quantity);
    await this.referrerUsersService.calculateReferralRewards(
      username,
      packageName,
      totalPrice,
    );
    await this.tokenTransferService.transferUsdt(findUserId, totalPrice);

    return true;
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
      status: 'pending',
    });
  }

  async purchasePackage(
    user: { id: string },
    packageId: string,
    quantity: number,
    customerName: string,
    customerPhone: string,
    customerAddress: string,
  ): Promise<string> {
    checkUserAuthentication(user);

    try {
      if (!user?.id) {
        throw new UnauthorizedException('User is not authenticated');
      }

      const myWallet = await this.getWallet(user.id);
      const selectedPackage = await this.getPackage(packageId);

      this.checkSufficientBalance(
        myWallet.usdtBalance,
        selectedPackage.price,
        quantity,
      );

      const totalPrice = selectedPackage.price * quantity;
      myWallet.usdtBalance -= totalPrice;
      await myWallet.save();

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

      return `Successfully purchased ${quantity} of ${selectedPackage.name}.`;
    } catch (error) {
      const err =
        error && typeof error === 'object' && 'message' in error ? error : '';
      throw new BadRequestException(err);
    }
  }

  async getUserPackages(user: { id: string }): Promise<PackageUsers[] | null> {
    try {
      if (!user?.id) {
        throw new UnauthorizedException('User is not authenticated');
      }

      const packageUsers = await this.packageUsersModel
        .find({ userId: user.id })
        .exec();
      if (!packageUsers) {
        throw new UnauthorizedException('packageUsers not found.');
      }

      return packageUsers;
    } catch {
      throw new UnauthorizedException(`{error.message}`);
    }
  }

  async adjustBalance(
    userId: string,
    currency: string,
    amount: number,
  ): Promise<boolean> {
    if (currency === 'USDT') {
      const wallet = await this.walletsService.findWalletById(userId);
      if (!wallet) {
        return false;
      }

      if (100 > amount) {
        throw new BadRequestException('100 USDT or less');
      }

      if (wallet.usdtBalance >= amount) {
        wallet.usdtBalance -= amount;
        await wallet.save();
        return true;
      }
    } else if (currency === 'BTC' || currency === 'DOGE') {
      const myPackage = await this.packageUsersModel
        .findOne({
          userId: userId,
          packageType: currency,
        })
        .exec();

      if (!myPackage) {
        return false;
      }

      const coinPrice = await this.coinPriceService.getCoinPrice(
        currency,
        'en',
      );
      if (coinPrice) {
        if (100 > amount * coinPrice.price) {
          throw new BadRequestException('100 USDT or less');
        }

        if (myPackage.miningBalance >= amount) {
          myPackage.miningBalance -= amount;
          await myPackage.save();
          return true;
        }
      }
    } else {
      return false;
    }

    return false;
  }
}
