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

    // 디버깅을 위한 로그
    // console.log('==== DEBUG START ====');
    // console.log('recordMiningLog = now: ', now.toISOString());
    // console.log('recordMiningLog = interval: ', interval, 'ms');
    // console.log(
    //   'recordMiningLog = intervalStart: ',
    //   intervalStart.toISOString(),
    // );
    // console.log('==== DEBUG END ====');

    // 현재 시간과 간격을 기준으로 기존 로그 검색
    const existingLog = await this.miningLogModel.findOne({
      userId,
      packageType,
      startTime: { $lte: now },
      endTime: { $gte: intervalStart },
    });

    if (existingLog) {
      // 기존 로그에 profit 추가
      // console.log('recordMiningLog = Found existing log:');
      // console.log(
      //   'recordMiningLog = existingLog.startTime: ',
      //   existingLog.startTime.toISOString(),
      // );
      // console.log(
      //   'recordMiningLog = existingLog.endTime: ',
      //   existingLog.endTime.toISOString(),
      // );
      // console.log('recordMiningLog = existingLog.profit: ', existingLog.profit);
      // console.log('recordMiningLog = Adding profit: ', profit);

      existingLog.profit += profit;
      existingLog.endTime = now;
      await existingLog.save();

      // console.log('recordMiningLog = Updated log saved:');
      // console.log('recordMiningLog = updatedLog.endTime: ', now.toISOString());
      // console.log('recordMiningLog = updatedLog.profit: ', existingLog.profit);
    } else {
      // 새로운 로그 생성
      // console.log('recordMiningLog = No existing log found. Creating new log:');
      // console.log(
      //   'recordMiningLog = New log startTime: ',
      //   intervalStart.toISOString(),
      // );
      // console.log('recordMiningLog = New log endTime: ', now.toISOString());
      // console.log('recordMiningLog = New log profit: ', profit);

      const newLog = new this.miningLogModel({
        userId,
        packageType,
        profit,
        startTime: intervalStart,
        endTime: now,
      });
      await newLog.save();

      // console.log('recordMiningLog = New log saved successfully.');
    }
  }
}
