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

  async getReferrerUsers(adminId: string): Promise<ReferrerUser[]> {
    if (!adminId) {
      throw new BadRequestException('Not User');
    }
    if (!this.usersService.isValidSuperUser(adminId)) {
      throw new BadRequestException('Not Super Admin');
    }

    return this.referrerUsersModel.find().exec();
  }

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

    if (feeRate < 0 || feeRate > 100) {
      throw new BadRequestException(
        'Invalid fee rate. Must be between 0 and 100.',
      );
    }

    const existingUser = await this.referrerUsersModel.findOne({
      userName,
      packageType,
    });
    if (existingUser) {
      throw new BadRequestException(
        'Referrer user already exists for this package type.',
      );
    }

    const referrerUser = new this.referrerUsersModel({
      userName,
      referrerUserName,
      packageType,
      feeRate,
    });

    return referrerUser.save();
  }

  async findReferrerByUserName(
    userName: string,
    packageType: string,
  ): Promise<ReferrerUser | null> {
    return this.referrerUsersModel.findOne({ userName, packageType }).exec();
  }

  async getGroupLeaderName(
    userName: string,
    packageType: string,
  ): Promise<string | null> {
    const refferrer = await this.referrerUsersModel
      .findOne({ userName, packageType })
      .exec();
    return refferrer?.groupLeaderName || null;
  }

  async calculateReferralRewards(
    username: string,
    packageType: string,
    totalPrice: number,
  ): Promise<void> {
    let currentUserName = username;

    while (true) {
      if (!currentUserName) {
        break;
      }

      const referrer = await this.findReferrerByUserName(
        currentUserName,
        packageType,
      );

      if (!referrer) {
        currentUserName =
          await this.usersService.findMyReferrer(currentUserName);
        continue;
      }

      const { groupLeaderName, feeRateLeader, feeRate } = referrer;

      if (feeRate > 0) {
        const profit = totalPrice * (feeRate / 100);
        if (profit > 0) {
          await this.walletsService.updateUsdtBalance(currentUserName, profit);
          await this.referrerLogsService.createReferralLog(
            groupLeaderName,
            currentUserName,
            username,
            packageType,
            profit,
          );
        }
      }

      if (feeRateLeader > 0 && groupLeaderName) {
        const leaderProfit = totalPrice * (feeRateLeader / 100);
        if (leaderProfit > 0) {
          await this.walletsService.updateUsdtBalance(
            groupLeaderName,
            leaderProfit,
          );
          await this.referrerLogsService.createReferralLog(
            groupLeaderName,
            groupLeaderName,
            username,
            packageType,
            leaderProfit,
          );
        }
      }

      break;
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
      if (!adminId) {
        throw new BadRequestException('Not User');
      }
      if (!this.usersService.isValidSuperUser(adminId)) {
        throw new BadRequestException('Not Super Admin');
      }

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

      return newReferrerUser;
    } catch (error) {
      console.error('[ERROR] Failed to add mining group:', error);
      throw new BadRequestException('Failed to add mining group.');
    }
  }
}
