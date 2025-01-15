// src/module/referrer-users/referrer-users.service.ts

import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReferrerUser } from './referrer-users.schema';
import { ReferrerLogsService } from '../referrer-logs/referrer-logs.service';
import { WalletsService } from '../wallets/wallets.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class ReferrerUsersService {
  constructor(
    @InjectModel(ReferrerUser.name)
    private readonly referrerUsersModel: Model<ReferrerUser>,
    private readonly referrerLogsService: ReferrerLogsService,
    private readonly walletsService: WalletsService,
    private readonly usersService: UsersService,
  ) {}

  // 보상 유저 가져오기
  async getReferrerUsers(adminId: string): Promise<ReferrerUser[]> {
    if (!adminId) {
      throw new BadRequestException('Not User');
    }
    if (!this.usersService.isValidSuperUser(adminId)) {
      throw new BadRequestException('Not Super Admin');
    }

    return this.referrerUsersModel.find().exec();
  }

  // 보상 유저 등록
  async addReferrerUser(
    adminId: string,
    userName: string,
    referrerUserName: string,
    packageType: string,
    feeRate: number,
  ): Promise<ReferrerUser> {
    if (!adminId) {
      throw new BadRequestException('Not User');
    }
    if (!this.usersService.isValidSuperUser(adminId)) {
      throw new BadRequestException('Not Super Admin');
    }

    //const userId = this.usersService.findUserIdByUsername(userName);

    // 유효성 검사
    if (feeRate < 0 || feeRate > 100) {
      throw new BadRequestException(
        'Invalid fee rate. Must be between 0 and 100.',
      );
    }

    // 이미 등록된 유저인지 확인
    const existingUser = await this.referrerUsersModel.findOne({
      userName,
      packageType,
    });
    if (existingUser) {
      throw new BadRequestException(
        'Referrer user already exists for this package type.',
      );
    }

    // 새로운 유저 등록
    const referrerUser = new this.referrerUsersModel({
      userName,
      referrerUserName,
      packageType,
      feeRate,
    });

    return referrerUser.save();
  }

  // 보상 유저 검색
  async findReferrerByUserName(
    userName: string,
    packageType: string,
  ): Promise<ReferrerUser | null> {
    const refferrer = this.referrerUsersModel
      .findOne({ userName, packageType })
      .exec();
    if (!refferrer) return null;
    return refferrer;
  }

  async calculateReferralRewards(
    username: string,
    packageType: string,
    totalPrice: number,
  ): Promise<void> {
    // 최초의 추천인 검색
    let currentUserName = await this.usersService.findMyReferrer(username);

    while (true) {
      // console.log(
      //   'calculateReferralRewards - currentUserName',
      //   currentUserName,
      // );
      // console.log('calculateReferralRewards - packageType', packageType);
      // console.log('calculateReferralRewards - totalPrice', totalPrice);

      if (!currentUserName) {
        break;
      }
      // 1. 보상 유저에서 검색
      const referrer = await this.findReferrerByUserName(
        currentUserName,
        packageType,
      );
      //console.log('calculateReferralRewards - referrer', referrer);
      if (!referrer) {
        break; // 상위 추천인이 없으면 종료
      }

      const { userName, referrerUserName, feeRate } = referrer;

      // 2. 수익 계산
      const profit = totalPrice * (feeRate / 100);

      if (profit > 0) {
        //console.log('calculateReferralRewards - userName', userName);
        //console.log('calculateReferralRewards - feeRate', feeRate);
        //console.log('calculateReferralRewards - totalPrice', totalPrice);

        // 3. 추천인 지갑에 수익 추가
        await this.walletsService.updateUsdtBalance(userName, profit);
        //await this.tokenTransferService.addRewardToWallet(referrerId, profit);

        // 4. 수익 로그 기록
        await this.referrerLogsService.createReferralLog(
          userName,
          referrerUserName,
          packageType,
          profit,
        );
      }

      // 5. 다음 상위 추천인으로 이동
      currentUserName = referrerUserName;
    }
  }
}
