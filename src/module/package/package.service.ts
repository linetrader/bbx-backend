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
import { UsersService } from 'src/module/users/users.service';
import { seedInitialPackages } from './initial-packages.seed';

@Injectable()
export class PackageService implements OnModuleInit {
  constructor(
    @InjectModel(Package.name) private readonly packageModel: Model<Package>,
    private readonly userService: UsersService, // 유저 서비스 주입
  ) {}

  // 모듈 초기화 시 호출
  async onModuleInit() {
    await seedInitialPackages(this.packageModel);
  }

  // admin 권한 확인 (이제 인증된 사용자 정보는 req.user에서 가져옴)
  async verifyAdmin(user: { id: string }): Promise<boolean> {
    if (!user || !user.id) {
      //throw new UnauthorizedException('User not authenticated.');
      return false;
    }

    const userRecord = await this.userService.findUserById(user.id);
    if (!userRecord) {
      //throw new UnauthorizedException('User not found.');
      return false;
    }

    // 유저 레벨이 슈퍼 어드민(1) 또는 어드민(2)일 경우에만 true 반환
    return userRecord.userLevel === 1 || userRecord.userLevel === 2;
  }

  async findShow(): Promise<Package[]> {
    const allPackages = await this.packageModel.find({ status: 'show' }).exec();
    return allPackages;
  }

  async findPackageById(packageId: string): Promise<any> {
    const selectedPackage = await this.packageModel.findById(packageId).exec();
    return selectedPackage;
  }

  // 패키지 목록 가져오기
  async getPackages(user: { id: string }): Promise<Package[]> {
    console.log('getPackages - ', user.id);
    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated.');
    }

    // 유저 정보 가져오기
    const userRecord = await this.userService.findUserById(user.id);
    if (!userRecord) {
      throw new UnauthorizedException('User not found.');
    }

    // 어드민 권한 확인
    const isAdmin = await this.verifyAdmin(user);

    // 어드민이면 모든 상품 반환, 아니면 `show` 상태의 상품만 반환
    if (isAdmin) {
      return this.packageModel.find().exec(); // 모든 상품 반환
    } else {
      return this.packageModel.find({ status: 'show' }).exec(); // `show` 상태의 상품만 반환
    }
  }
  // 총 사용자 수 반환
  async getTotalPackages(): Promise<number> {
    return this.packageModel.countDocuments().exec(); // 사용자 수 카운트
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
    logInterval: number,
    status: string,
  ): Promise<Package> {
    const findPackage = await this.packageModel.findOne({ name }).exec();
    if (!findPackage) {
      throw new BadRequestException('Package not found.');
    }
    findPackage.price = price;
    findPackage.logInterval = logInterval;
    findPackage.status = status;
    return findPackage.save();
  }
}
