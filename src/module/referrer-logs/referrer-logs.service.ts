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

  // 수익 로그 생성
  async createReferralLog(
    userName: string,
    referrerUserName: string,
    packageType: string,
    profit: number,
  ): Promise<void> {
    const log = new this.referrerLogModel({
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
    // 1. Admin 검증
    const isAdmin = await this.usersService.isValidAdmin(userId);
    if (!isAdmin) {
      throw new BadRequestException('Not Admin.');
    }

    // 2. 현재 사용자의 userName 가져오기
    const userName = await this.usersService.getUserName(userId);

    // 3. Aggregation Pipeline 실행
    const result = await this.referrerLogModel.aggregate([
      {
        $graphLookup: {
          from: 'referrerlogs',
          startWith: userName,
          connectFromField: 'userName',
          connectToField: 'referrerUserName',
          as: 'allReferredUsers',
        },
      },
      {
        $addFields: {
          allUserNames: {
            $setUnion: [
              [userName],
              {
                $map: {
                  input: '$allReferredUsers',
                  as: 'user',
                  in: '$$user.userName',
                },
              },
            ],
          },
        },
      },
      {
        $lookup: {
          from: 'referrerlogs',
          localField: 'allUserNames',
          foreignField: 'userName',
          as: 'userLogs',
        },
      },
      { $unwind: '$userLogs' },
      {
        $group: {
          _id: '$userLogs._id',
          userLog: { $first: '$userLogs' },
        },
      },
      { $sort: { 'userLog.createdAt': -1 } },
      {
        $group: {
          _id: null,
          data: { $push: '$userLog' },
          totalCount: { $sum: 1 },
        },
      },
      {
        $project: {
          data: { $slice: ['$data', offset, limit] },
          totalCount: 1,
        },
      },
    ]);

    const data = result.length > 0 ? result[0].data : [];
    const total = result.length > 0 ? result[0].totalCount : 0;

    // 4. `_id` -> `id`로 변환
    const formattedData = data.map((item: any) => ({
      id: item._id.toString(), // GraphQL에서 기대하는 `id`로 변환
      userName: item.userName,
      referrerUserName: item.referrerUserName,
      packageType: item.packageType,
      profit: item.profit,
      createdAt: item.createdAt,
    }));

    return { data: formattedData, total };
  }

  async getAllReferralLogs(userId: string): Promise<ReferrerLog[]> {
    // const isAdmin = await this.usersService.isValidAdmin(userId);
    // if (!isAdmin) {
    //   throw new BadRequestException('Not Admin.');
    // }
    const userName = await this.usersService.getUserName(userId);

    return this.referrerLogModel.find({ userName }).exec();
  }
}
