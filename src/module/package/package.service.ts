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
//import { seedInitialPackages } from './initial-packages.seed';

@Injectable()
export class PackageService implements OnModuleInit {
  constructor(
    @InjectModel(Package.name) private readonly packageModel: Model<Package>,
    private readonly userService: UsersService, // 유저 서비스 주입
  ) {}

  // 모듈 초기화 시 호출
  async onModuleInit() {
    //await seedInitialPackages(this.packageModel);
  }

  async findShow(): Promise<Package[]> {
    const allPackages = await this.packageModel.find({ status: 'show' }).exec();
    return allPackages;
  }

  async findPackageById(packageId: string): Promise<any> {
    const selectedPackage = await this.packageModel.findById(packageId).exec();
    return selectedPackage;
  }

  async getPackagePrice(packageName: string): Promise<number> {
    // 패키지 검색
    const foundPackage = await this.packageModel
      .findOne({ name: packageName })
      .exec();

    // 패키지가 없는 경우 에러 반환
    if (!foundPackage) {
      throw new BadRequestException(
        `Package with name ${packageName} not found.`,
      );
    }

    // 패키지의 price 반환
    return foundPackage.price;
  }

  // 패키지 마이닝 수량 저장하기
  async savePacakeMiningProfit(
    name: string,
    miningProfit: number,
  ): Promise<boolean> {
    const selectedPackage = await this.packageModel.findOne({ name }).exec();
    if (selectedPackage) {
      selectedPackage.miningProfit = miningProfit;
      selectedPackage.save();
    }
    return false;
  }

  // 패키지 목록 가져오기
  async getPackages(user: { id: string }): Promise<Package[]> {
    //console.log('getPackages - ', user.id);
    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated.');
    }

    // 유저 정보 가져오기
    const userRecord = await this.userService.findUserById(user.id);
    if (!userRecord) {
      throw new UnauthorizedException('User not found.');
    }

    // 어드민 권한 확인
    //const isAdmin = await this.verifyAdmin(user);
    //const isAdmin = await this.userService.isValidAdmin(user.id);

    // 어드민이면 모든 상품 반환, 아니면 `show` 상태의 상품만 반환
    return this.packageModel.find({ status: 'show' }).exec(); // `show` 상태의 상품만 반환
  }

  // 총 사용자 수 반환
  async getTotalPackages(): Promise<number> {
    return this.packageModel.countDocuments().exec(); // 사용자 수 카운트
  }

  async getPackagesAdmin(userId: string): Promise<Package[]> {
    const isAdmin = await this.userService.isValidAdmin(userId);
    if (!isAdmin) {
      throw new UnauthorizedException('User not found.');
    }

    return this.packageModel.find().exec(); // 모든 상품 반환
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
