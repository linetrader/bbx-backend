import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MiningLog } from './mining-logs.schema';

@Injectable()
export class MiningLogsService {
  constructor(
    @InjectModel(MiningLog.name)
    private readonly miningLogModel: Model<MiningLog>,
  ) {}

  async recordMiningLog(
    userId: string,
    packageType: string,
    profit: number,
    interval: number, // 간격 (밀리초 단위)
  ): Promise<void> {
    const now = new Date();
    const intervalStart = new Date(now.getTime() - interval);

    const existingLog = await this.miningLogModel.findOne({
      userId,
      packageType,
      startTime: { $lte: now },
      endTime: { $gte: intervalStart },
    });

    if (existingLog) {
      existingLog.profit += profit;
      existingLog.endTime = now;
      await existingLog.save();
    } else {
      const newLog = new this.miningLogModel({
        userId,
        packageType,
        profit,
        startTime: intervalStart,
        endTime: now,
      });
      await newLog.save();
    }
  }
}
