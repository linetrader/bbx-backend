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

@Injectable()
export class PackageService implements OnModuleInit {
  constructor(
    @InjectModel(Package.name) private readonly packageModel: Model<Package>,
    private readonly userService: UsersService,
  ) {}

  async onModuleInit() {
    // 초기화 로직이 주석 처리되어 있음
  }

  async findShow(): Promise<Package[]> {
    return this.packageModel.find({ status: 'show' }).exec();
  }

  async findPackageById(packageId: string): Promise<any> {
    return this.packageModel.findById(packageId).exec();
  }

  async getPackagePrice(packageName: string): Promise<number> {
    const foundPackage = await this.packageModel
      .findOne({ name: packageName })
      .exec();

    if (!foundPackage) {
      throw new BadRequestException(
        `Package with name ${packageName} not found.`,
      );
    }

    return foundPackage.price;
  }

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

  async getPackages(user: { id: string }): Promise<Package[]> {
    if (!user?.id) {
      throw new UnauthorizedException('User not authenticated.');
    }

    const userRecord = await this.userService.findUserById(user.id);
    if (!userRecord) {
      throw new UnauthorizedException('User not found.');
    }

    return this.packageModel.find({ status: 'show' }).exec();
  }

  async getTotalPackages(): Promise<number> {
    return this.packageModel.countDocuments().exec();
  }

  async getPackagesAdmin(userId: string): Promise<Package[]> {
    const isAdmin = await this.userService.isValidAdmin(userId);
    if (!isAdmin) {
      throw new UnauthorizedException('User not found.');
    }

    return this.packageModel.find().exec();
  }

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
