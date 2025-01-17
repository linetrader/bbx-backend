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

  async getMiningGroup(adminId: string): Promise<ReferrerUser[]> {
    if (!adminId) {
      throw new BadRequestException('Not User');
    }
    if (!this.usersService.isValidSuperUser(adminId)) {
      throw new BadRequestException('Not Super Admin');
    }

    return this.referrerUsersModel.find({ adminId }).exec();
  }

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
    const refferrer = await this.referrerUsersModel
      .findOne({ userName, packageType })
      .exec();
    if (!refferrer) return null;
    return refferrer;
  }

  async getGroupLeaderName(
    userName: string,
    packageType: string,
  ): Promise<string | null> {
    const refferrer = await this.referrerUsersModel
      .findOne({ userName, packageType })
      .exec();
    if (!refferrer) return null;

    return refferrer.groupLeaderName;
  }

  async calculateReferralRewards(
    username: string,
    packageType: string,
    totalPrice: number,
  ): Promise<void> {
    let currentUserName = username;

    while (true) {
      if (!currentUserName) {
        break; // 상위 추천인이 없으면 루프 종료
      }

      // 1. username을 보상 유저에서 검색
      const referrer = await this.findReferrerByUserName(
        currentUserName,
        packageType,
      );

      if (!referrer) {
        // 추천인을 찾을 수 없으면 다음 상위 추천인으로 이동
        currentUserName =
          await this.usersService.findMyReferrer(currentUserName);
        continue;
      }

      const { groupLeaderName, feeRateLeader, feeRate } = referrer;

      // 2. feeRate를 사용해 profit 계산 및 username 보상 처리
      if (feeRate > 0) {
        const profit = totalPrice * (feeRate / 100);
        if (profit > 0) {
          await this.walletsService.updateUsdtBalance(currentUserName, profit);

          // 3. 수익 로그 기록
          await this.referrerLogsService.createReferralLog(
            groupLeaderName,
            currentUserName,
            username,
            packageType,
            profit,
          );
        }
      }

      // 4. feeRateLeader를 사용해 groupLeaderName 보상 처리
      if (feeRateLeader > 0 && groupLeaderName) {
        const leaderProfit = totalPrice * (feeRateLeader / 100);
        if (leaderProfit > 0) {
          await this.walletsService.updateUsdtBalance(
            groupLeaderName,
            leaderProfit,
          );

          // 수익 로그 기록
          await this.referrerLogsService.createReferralLog(
            groupLeaderName,
            groupLeaderName,
            username, // 현재 추천인을 referrer로 설정
            packageType,
            leaderProfit,
          );
        }
      }

      // 5. 다음 상위 추천인으로 이동
      currentUserName = await this.usersService.findMyReferrer(currentUserName);
    }
  }

  async addMiningGroup(
    adminId: string,
    groupLeaderName: string,
    userName: string,
    packageType: string,
    feeRateLeader: number,
    feeRate: number,
  ): Promise<ReferrerUser> {
    try {
      console.log('addMiningGroup - groupLeaderName', groupLeaderName);
      console.log('addMiningGroup - userName', userName);
      console.log('addMiningGroup - packageType', packageType);
      console.log('addMiningGroup - feeRateLeader', feeRateLeader);
      console.log('addMiningGroup - feeRate', feeRate);

      // 1. 어드민 권한 확인
      if (!adminId) {
        throw new BadRequestException('Not User');
      }
      if (!this.usersService.isValidSuperUser(adminId)) {
        throw new BadRequestException('Not Super Admin');
      }

      // 2. feeRate 유효성 검사
      if (feeRateLeader < 0 || feeRateLeader > 100) {
        throw new BadRequestException(
          'Invalid fee rate. Must be between 0 and 100.',
        );
      }

      if (feeRate < 0 || feeRate > 100) {
        throw new BadRequestException(
          'Invalid fee rate. Must be between 0 and 100.',
        );
      }

      //if ()
      const referrerUser = await this.referrerUsersModel
        .findOne({ userName })
        .exec();

      if (referrerUser) {
        throw new BadRequestException('Is referrerUser');
      }

      const newReferrerUser = new this.referrerUsersModel({
        groupLeaderName,
        userName,
        packageType,
        feeRateLeader,
        feeRate,
      });

      await newReferrerUser.save();

      // 6. 생성된 문서 배열 반환
      return newReferrerUser;
    } catch (error) {
      console.error('[ERROR] Failed to add mining group:', error);
      throw new BadRequestException('Failed to add mining group.');
    }
  }
  // async addMiningGroup(
  //   adminId: string,
  //   groupLeaderName: string,
  //   packageType: string,
  //   feeRate: number,
  // ): Promise<ReferrerUser[]> {
  //   try {
  //     // 1. 어드민 권한 확인
  //     if (!adminId) {
  //       throw new BadRequestException('Not User');
  //     }
  //     if (!this.usersService.isValidSuperUser(adminId)) {
  //       throw new BadRequestException('Not Super Admin');
  //     }

  //     // 2. feeRate 유효성 검사
  //     if (feeRate < 0 || feeRate > 100) {
  //       throw new BadRequestException(
  //         'Invalid fee rate. Must be between 0 and 100.',
  //       );
  //     }

  //     // 3. 그룹장의 ID 가져오기
  //     const groupLeaderId =
  //       await this.usersService.findUserIdByUsername(groupLeaderName);
  //     if (!groupLeaderId) {
  //       throw new BadRequestException('Invalid group leader name.');
  //     }

  //     //console.log('addMiningGroup - groupLeaderName', groupLeaderName);

  //     // 4. 그룹장 산하의 유저 ID 들을 가져오기
  //     const userIds =
  //       await this.usersService.getUserIdsUnderMyNetwork(groupLeaderId);

  //     //console.log('addMiningGroup - userIds', userIds);

  //     if (!userIds || userIds.length === 0) {
  //       throw new BadRequestException(
  //         `No users found under the group leader: ${groupLeaderName}`,
  //       );
  //     }

  //     // 5. ReferrerUser 문서 생성
  //     const referrerUsers: ReferrerUser[] = [];

  //     for (const userId of userIds) {
  //       const userName = await this.usersService.getUserName(userId);
  //       //console.log('addMiningGroup - userName', userName);
  //       if (!userName) continue;
  //       const referrerUserName =
  //         await this.usersService.findMyReferrer(userName);
  //       if (!referrerUserName) continue;
  //       const referrerUserId =
  //         await this.usersService.findUserIdByUsername(referrerUserName);

  //       const newReferrerUser = new this.referrerUsersModel({
  //         groupLeaderId,
  //         groupLeaderName,
  //         userId,
  //         userName: userName || 'Unknown',
  //         referrerUserId: referrerUserId,
  //         referrerUserName: referrerUserName || 'Unknown',
  //         packageType,
  //         feeRate: 0.0,
  //       });

  //       const savedReferrerUser = await newReferrerUser.save();
  //       referrerUsers.push(savedReferrerUser);
  //     }

  //     // 6. 생성된 문서 배열 반환
  //     return referrerUsers;
  //   } catch (error) {
  //     console.error('[ERROR] Failed to add mining group:', error);
  //     throw new BadRequestException('Failed to add mining group.');
  //   }
  // }
}
