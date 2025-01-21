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
  ): Promise<{ date: Date; profit: number; packageType: string }[]> {
    const logs = await this.miningLogModel
      .find({ userId })
      .sort({ startTime: 1 })
      .skip(offset)
      .limit(limit)
      .exec();

    const groupedLogs = logs.reduce(
      (
        acc: {
          [key: string]: { date: Date; profit: number; packageType: string };
        },
        log,
      ) => {
        const date = new Date(log.startTime);
        date.setUTCHours(0, 0, 0, 0);
        const dateString = date.toISOString();

        if (!acc[dateString]) {
          acc[dateString] = { date, profit: 0, packageType: log.packageType };
        }

        acc[dateString].profit += log.profit;
        return acc;
      },
      {},
    );

    return Object.values(groupedLogs);
  }
}
