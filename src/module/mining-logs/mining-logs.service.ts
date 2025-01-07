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

    // 현재 시간과 간격을 기준으로 기존 로그 검색
    const existingLog = await this.miningLogModel.findOne({
      userId,
      packageType,
      startTime: { $lte: now },
      endTime: { $gte: intervalStart },
    });

    if (existingLog) {
      // 기존 로그에 profit 추가
      console.log('recordMiningLog = profit - ', profit);
      console.log(
        'recordMiningLog = existingLog.profit - ',
        existingLog.profit,
      );
      existingLog.profit += profit;
      existingLog.endTime = now;
      await existingLog.save();
    } else {
      // 새로운 로그 생성
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
