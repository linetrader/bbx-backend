// src/module/referrer-logs/referrer-logs.service.ts

import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReferrerLog } from './referrer-logs.schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class ReferrerLogsService {
  constructor(
    @InjectModel(ReferrerLog.name)
    private readonly referrerLogModel: Model<ReferrerLog>,
    private readonly usersService: UsersService,
  ) {}

  async createReferralLog(
    groupLeaderName: string,
    userName: string,
    referrerUserName: string,
    packageType: string,
    profit: number,
  ): Promise<void> {
    const log = new this.referrerLogModel({
      groupLeaderName,
      userName,
      referrerUserName,
      packageType,
      profit,
    });
    await log.save();
  }

  async getAllReferralLogsAdmin(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<{ data: ReferrerLog[]; total: number }> {
    const isAdmin = await this.usersService.isValidAdmin(userId);
    if (!isAdmin) {
      throw new BadRequestException('Not Admin.');
    }

    const groupLeaderName = await this.usersService.getUserName(userId);

    const refLogs = await this.referrerLogModel
      .find({ groupLeaderName })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .exec();

    const total = await this.referrerLogModel
      .countDocuments({ groupLeaderName })
      .exec();

    return { data: refLogs, total };
  }

  async getAllReferralLogs(userId: string): Promise<ReferrerLog[]> {
    const userName = await this.usersService.getUserName(userId);
    return this.referrerLogModel.find({ userName }).exec();
  }
}
