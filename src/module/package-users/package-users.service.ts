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

@Injectable()
export class PackageUsersService implements OnModuleInit {
  private packageData: Record<
    string,
    { name: string; miningProfit: number; logInterval: number }
  > = {}; // 패키지 데이터를 저장하는 전역 변수

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
  ) {}

  async onModuleInit() {
    //console.log('Starting mining process for active packages...');
    await this.initialMiningForAllPackages();
    await this.initialPacakageUsers();
    //this.startMiningForPackage();
  }

  private async initialPacakageUsers(): Promise<void> {
    try {
      // 1. groupLeaderName이 없는 문서 찾기
      const packageUsersWithoutGroupLeader = await this.packageUsersModel
        .find({ groupLeaderName: { $exists: false } })
        .exec();

      if (
        !packageUsersWithoutGroupLeader ||
        packageUsersWithoutGroupLeader.length === 0
      ) {
        console.log('No documents found without groupLeaderName.');
        return;
      }

      // 2. 문서 업데이트 처리
      for (const user of packageUsersWithoutGroupLeader) {
        const userId = user.userId;

        // username 가져오기
        const userName = await this.usersService.getUserName(userId);

        // (1) groupLeaderName 가져오기
        const groupLeaderName = await this.findMiningGroupLeaderName(
          userName,
          user.packageType,
        );

        // (2) referrerUserName 가져오기
        const referrerUserName =
          await this.usersService.findMyReferrerById(userId);

        if (!referrerUserName) {
          console.warn(`Referrer not found for userId: ${userId}. Skipping.`);
          continue; // 레퍼럴이 없으면 다음 문서로 넘어감
        }

        if (!groupLeaderName) {
          console.warn(
            `Group leader not found for userId: ${userId}. Skipping.`,
          );
          continue; // 그룹 리더를 찾을 수 없으면 다음 문서로 넘어감
        }

        // (3) 문서 업데이트
        user.referrerUserName = referrerUserName;
        user.groupLeaderName = groupLeaderName;

        // (4) 저장
        await user.save();
        console.log(
          `Updated package user: ${userId} with groupLeaderName: ${groupLeaderName}`,
        );
      }

      console.log('Initial package users update completed.');
    } catch (error) {
      console.error('[ERROR] Failed to initialize package users:', error);
      throw new BadRequestException('Failed to initialize package users.');
    }
  }

  async getMiningCustomers(
    limit: number,
    offset: number,
    user: { id: string },
  ): Promise<{ data: GetMiningCustomerResponse[]; totalCustomers: number }> {
    // 1. 요청 사용자가 어드민인지 확인
    const requestingUser = await this.usersService.isValidAdmin(user.id);
    if (!requestingUser) {
      throw new BadRequestException(
        'Unauthorized: Access is restricted to admins only.',
      );
    }

    // 2. 현재 사용자(user.id) 산하의 userIds 가져오기
    const userIds = await this.usersService.getUserIdsUnderMyNetwork(user.id);
    //console.log('getMiningCustomers', userIds);

    // 3. userIds를 기준으로 패키지 사용자 정보 검색
    const packageUsers = await this.packageUsersModel
      .find({ userId: { $in: userIds } })
      .sort({ createdAt: -1 }) // 최신순 정렬
      .skip(offset) // 페이징 처리
      .limit(limit)
      .exec();

    // 4. userIds 기반 총 마이닝 고객 수 계산
    const totalCustomers = await this.packageUsersModel
      .countDocuments({ userId: { $in: userIds } })
      .exec();

    //console.log('getMiningCustomers - totalCustomers', totalCustomers);

    // 5. 데이터를 GetMiningCustomerResponse 형식으로 변환
    const data = await Promise.all(
      packageUsers.map(async (user) => {
        const username = await this.usersService.getUserName(user.userId);
        //console.log('getMiningCustomers - username', username);
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

  /**
   * 모든 패키지 데이터를 전역 변수에 저장
   */
  async initialMiningForAllPackages(): Promise<void> {
    //const allPackages = await this.packageModel.find({ status: 'show' }).exec();
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

    //console.log('Package data initialized:', this.packageData);
  }

  /**
   * 저장된 패키지 데이터를 기반으로 마이닝 실행
   */
  async startMiningForPackage(miningInterval: number): Promise<void> {
    for (const packageName in this.packageData) {
      const { name, miningProfit, logInterval } = this.packageData[packageName];

      // 24시간 채굴량을 초 단위로 나누고, 해당 interval 동안의 채굴량 계산
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

          // 마이닝 기록
          //console.log('마이닝 기록...');
          await this.miningLogsService.recordMiningLog(
            packageUser.userId,
            packageUser.packageType,
            totalProfit,
            logInterval,
          );

          //console.log(`User ${packageUser.userId} mined ${totalProfit} for package ${name}`,);
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
    //console.log('getWallet - ', wallet);
    if (!wallet) {
      throw new BadRequestException('Wallet not found for the user.');
    }
    return wallet;
  }

  private async getPackage(packageId: string): Promise<Package> {
    //const selectedPackage = await this.packageModel.findById(packageId).exec();
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
    // 1. 유저 id 찾기
    //const userId = await this.usersService.findUserIdByUsername(username);

    // 2. 월렛 id 찾기
    //const walletId = await this.walletsService.findWalletIdByUserId(userId);

    const userPackage = await this.packageUsersModel.findOne({
      userId,
      packageType: packageName,
    });

    if (userPackage) {
      userPackage.quantity += quantity;
      await userPackage.save();
    }
  }

  private async findMiningGroupLeaderName(
    inUserName: string,
    packageType: string,
  ): Promise<string | null> {
    try {
      // Step 1: 현재 유저가 속한 그룹의 리더 이름 검색
      const leaderName = await this.referrerUsersService.getGroupLeaderName(
        inUserName,
        packageType,
      );

      if (leaderName) {
        // 그룹 리더 이름이 발견되면 바로 반환
        return leaderName;
      }

      // Step 2: 현재 유저의 부모(referrer) 검색
      const referrerUserName =
        await this.usersService.findMyReferrer(inUserName);

      if (!referrerUserName) {
        // 부모가 없는 경우 최상위 유저로 간주, 리더를 찾을 수 없으므로 null 반환
        return null;
      }

      // Step 3: 부모를 기준으로 재귀 호출하여 그룹 리더 이름 검색
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
    // 1. 요청 사용자가 어드민인지 확인
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

    // 1. 유저 지갑에서 테더 회사 지갑으로 전송
    const packagePrice = await this.packageService.getPackagePrice(packageName);
    const totalPrice = packagePrice * quantity; // 총 금액

    //    if (resTrans) {
    // 2. 계약서 승인 상태 저장.
    const isContract = await this.contractsService.confirmContract(contractId);
    if (!isContract) {
      throw new BadRequestException('계약서가 없습니다.');
    }

    // 3. 업데이트 패키지.
    await this.updateUserPackage(findUserId, packageName, quantity);

    // 4. 레퍼럴 수익 정산.
    await this.referrerUsersService.calculateReferralRewards(
      username,
      packageName,
      totalPrice,
    );

    // 1. 유저 지갑에서 테더 회사 지갑으로 전송
    await this.tokenTransferService.transferUsdt(findUserId, totalPrice);

    return true;
    //  }

    //return false;
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

      // 4. 지갑 잔액 차감
      myWallet.usdtBalance -= totalPrice;
      await myWallet.save();

      // 5. 계약서 생성
      const contractCreated = await this.createContract(
        customerName,
        customerPhone,
        customerAddress,
        user.id,
        selectedPackage.name,
        quantity,
        totalPrice,
        //status: 'pending'
      );

      if (!contractCreated) {
        throw new BadRequestException('Failed to create contract.');
      }

      // 6. 사용자 패키지 업데이트
      const userPackage = await this.packageUsersModel.findOne({
        userId: user.id,
        packageType: selectedPackage.name,
      });

      // 7. 없으면 생성
      if (!userPackage) {
        const referrer = await this.usersService.findMyReferrerById(user.id);
        if (!referrer) {
          throw new BadRequestException('Not referrer');
        }
        const leaderName = await this.findMiningGroupLeaderName(
          referrer,
          selectedPackage.name,
        );
        const newUserPackage = new this.packageUsersModel({
          userId: user.id,
          groupLeaderName: leaderName,
          referrerUserName: referrer,
          walletId: myWallet.id,
          packageType: selectedPackage.name,
          quantity: 0.0,
          miningBalance: 0.0,
        });
        await newUserPackage.save();
      }

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
    } catch {
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
      const wallet = await this.walletsService.findWalletById(userId);
      //console.log('adjustBalance - ', wallet);
      if (!wallet) {
        return false;
      }

      if (wallet.usdtBalance > amount) {
        wallet.usdtBalance = wallet.usdtBalance - amount;
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

      //console.log('adjustBalance - myPackage : ', myPackage);

      if (!myPackage) {
        return false;
      }
      if (myPackage.miningBalance > amount) {
        myPackage.miningBalance = myPackage.miningBalance - amount;
        await myPackage.save();
        return true;
      }
    } else {
      return false;
    }

    return false;
  }
}
