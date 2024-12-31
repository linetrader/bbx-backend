// src/module/package/package-users.service.ts

import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PackageUsers } from './package-users.schema';
import { Package } from '../package/package.schema';
import { PackageRecordService } from '../package-record/package-record.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class PackageUsersService {
  constructor(
    @InjectModel(PackageUsers.name)
    private readonly packageUsersModel: Model<PackageUsers>,
    @InjectModel(Package.name)
    private readonly packageModel: Model<Package>,
    private readonly packageRecordService: PackageRecordService,
    private readonly jwtService: JwtService,
  ) {}

  // 1. 패키지 구매 및 수량 업데이트
  async purchasePackage(
    authHeader: string,
    packageId: string,
    quantity: number,
  ): Promise<string> {
    try {
      if (!authHeader) {
        throw new UnauthorizedException('Authorization header is missing.');
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        throw new UnauthorizedException('Bearer token is missing.');
      }

      // 1. userId 추출
      const decoded = this.jwtService.verify(token); // JWT 토큰 검증
      const userId = decoded.id;
      if (!userId) {
        throw new UnauthorizedException('User not found.');
      }

      //console.log(userId);

      // 2. 패키지 조회
      const selectedPackage = await this.packageModel
        .findById(packageId)
        .exec();

      if (!selectedPackage) {
        throw new BadRequestException('Selected package not found.');
      }

      const totalPrice = selectedPackage.price * quantity;

      // 3. PackageUsers 데이터 업데이트
      const userPackage = await this.packageUsersModel.findOne({
        userId,
        packageType: selectedPackage.name,
      });

      if (userPackage) {
        userPackage.quantity += quantity;
        await userPackage.save();
      } else {
        const newUserPackage = new this.packageUsersModel({
          userId,
          packageType: selectedPackage.name,
          quantity,
        });
        await newUserPackage.save();
      }

      // 4. 구매 기록 생성
      await this.packageRecordService.createPackageRecord({
        userId,
        packageName: selectedPackage.name,
        quantity,
        totalPrice,
      });

      return `Successfully purchased ${quantity} of ${selectedPackage.name}.`;
    } catch (error) {
      throw new BadRequestException('purchasePackage failed');
    }
  }

  // 3. 특정 유저의 패키지 수량 조회
  async getUserPackages(authHeader: string): Promise<PackageUsers[]> {
    const userId = this.jwtService.verify(authHeader);
    return this.packageUsersModel.find({ userId }).exec();
  }
}
