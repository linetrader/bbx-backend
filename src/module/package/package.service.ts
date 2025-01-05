// src/package/package.service.ts

import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Package } from './package.schema';
import { User } from 'src/module/users/users.schema';
import { UsersService } from 'src/module/users/users.service';
import { seedInitialPackages } from './initial-packages.seed';

@Injectable()
export class PackageService implements OnModuleInit {
  constructor(
    @InjectModel(Package.name) private readonly packageModel: Model<Package>,
    @InjectModel(User.name) private readonly userModel: Model<User>, // User 모델 추가
    private readonly userService: UsersService, // 유저 서비스 주입
  ) {}

  // 모듈 초기화 시 호출
  async onModuleInit() {
    await seedInitialPackages(this.packageModel);
  }

  // admin 권한 확인 (이제 인증된 사용자 정보는 req.user에서 가져옴)
  async verifyAdmin(user: { id: string }): Promise<boolean> {
    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated.');
    }

    const userRecord = await this.userModel.findById(user.id).exec();
    if (!userRecord) {
      throw new UnauthorizedException('User not found.');
    }

    // 유저 레벨이 슈퍼 어드민(1) 또는 어드민(2)일 경우에만 true 반환
    return userRecord.userLevel === 1 || userRecord.userLevel === 2;
  }

  // 패키지 목록 가져오기
  async getPackages(user: { id: string }): Promise<Package[]> {
    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated.');
    }

    const userRecord = await this.userService.findUserById(user.id);
    if (!userRecord) {
      throw new UnauthorizedException('User not found.');
    }

    const packages = await this.packageModel.find({ status: 'show' }).exec();
    return packages;
  }

  // 패키지 추가
  async addPackage(createPackageDto: {
    name: string;
    price: number;
    status: string;
  }): Promise<Package> {
    const existingPackage = await this.packageModel
      .findOne({ name: createPackageDto.name })
      .exec();
    if (existingPackage) {
      throw new BadRequestException('A package with this name already exists.');
    }

    const newPackage = new this.packageModel(createPackageDto);
    await newPackage.save();
    return newPackage;
  }

  // 패키지 수정
  async changePackage(
    name: string,
    price: number,
    //miningInterval: number,
    status: string,
  ): Promise<Package> {
    const findPackage = await this.packageModel.findOne({ name }).exec();
    if (!findPackage) {
      throw new BadRequestException('Package not found.');
    }
    findPackage.price = price;
    //findPackage.miningInterval = miningInterval;
    findPackage.status = status;
    return findPackage.save();
  }
}
