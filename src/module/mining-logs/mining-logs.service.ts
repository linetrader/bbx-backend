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

    // 현재 날짜의 UTC 기준 시작/끝 시간 (ISO 형식으로 변환)
    const startOfDay = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    ).toISOString();
    const endOfDay = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    ).toISOString();

    // MongoDB에서 UTC 기준으로 오늘 날짜의 기존 로그 조회
    const existingLog = await this.miningLogModel.findOne({
      userId,
      packageType,
      startTime: { $gte: startOfDay, $lte: endOfDay },
    });

    if (existingLog) {
      // 기존 로그의 날짜가 오늘과 같은지 확인
      const logDate = new Date(existingLog.startTime);
      const isSameDay =
        logDate.getUTCFullYear() === now.getUTCFullYear() &&
        logDate.getUTCMonth() === now.getUTCMonth() &&
        logDate.getUTCDate() === now.getUTCDate();

      if (isSameDay) {
        console.log(`Updating existing log for user ${userId}`);

        // 기존 로그 업데이트 (UTC 기준)
        existingLog.profit += profit;
        existingLog.endTime = now;
        await existingLog.save();
        return;
      }
    }

    console.log(`Creating new log for user ${userId}`);
    // 기존 로그가 없거나 날짜가 변경된 경우 새로운 로그 생성
    const newLog = new this.miningLogModel({
      userId,
      packageType,
      profit,
      startTime: intervalStart, // UTC 기준
      endTime: now, // UTC 기준
    });

    await newLog.save();
  }

  async getMiningLogsByDate(userId: string, date: Date): Promise<MiningLog[]> {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return this.miningLogModel
      .find({
        userId,
        startTime: { $gte: startOfDay, $lte: endOfDay },
      })
      .exec();
  }

  async get24HourMiningProfit(userId: string): Promise<number> {
    const now = new Date();
    const startOf24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const logs = await this.miningLogModel
      .find({
        userId,
        startTime: { $gte: startOf24Hours, $lte: now },
      })
      .exec();

    return logs.reduce((total, log) => total + log.profit, 0);
  }

  async getAllMiningLogsGroupedByDay(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<MiningLog[]> {
    const logs = await this.miningLogModel
      .find({ userId })
      .sort({ startTime: -1 })
      .skip(offset)
      .limit(limit)
      .exec();

    return logs;
  }
}
