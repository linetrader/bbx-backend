// src/module/referrer-logs/referrer-logs.service.ts

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReferrerLog } from './referrer-logs.schema';

@Injectable()
export class ReferrerLogsService {
  constructor(
    @InjectModel(ReferrerLog.name)
    private readonly referrerLogModel: Model<ReferrerLog>,
  ) {}

  // 수익 로그 생성
  async createReferralLog(
    userName: string,
    packageType: string,
    profit: number,
  ): Promise<void> {
    const log = new this.referrerLogModel({
      userName,
      packageType,
      profit,
    });
    await log.save();
  }

  async getAllReferralLogs(): Promise<ReferrerLog[]> {
    return this.referrerLogModel.find().exec();
  }
}
