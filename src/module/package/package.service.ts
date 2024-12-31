// src/package/package.service.ts

import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Package } from './package.schema';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/module/users/users.schema';
import { UsersService } from 'src/module/users/users.service';

@Injectable()
export class PackageService {
  constructor(
    @InjectModel(Package.name) private readonly packageModel: Model<Package>,
    @InjectModel(User.name) private readonly userModel: Model<User>, // User 모델 추가
    private readonly jwtService: JwtService,
    private readonly userService: UsersService, // 유저 서비스 주입
  ) {}

  async verifyAdmin(authHeader: string): Promise<boolean> {
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing.');
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      const user = await this.userModel.findById(decoded.id).exec();

      if (!user) {
        throw new UnauthorizedException('User not found.');
      }

      // 유저 레벨이 슈퍼 어드민(1) 또는 어드민(2)일 경우에만 true 반환
      return user.userLevel === 1 || user.userLevel === 2;
    } catch (error) {
      console.error(`Token validation failed: ${(error as Error).message}`);
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }

  async getPackages(authHeader: string): Promise<Package[]> {
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing.');
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      const user = await this.userService.findUserById(decoded.id);

      //console.log(user);

      if (!user) {
        throw new UnauthorizedException('User not found.');
      }

      const packages = await this.packageModel.find({ status: 'show' }).exec();
      //console.log(packages);

      return packages;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Error verifying token: ${error.message}`);
      } else {
        console.error('An unknown error occurred during token verification.');
      }
      throw new UnauthorizedException('Invalid or expired token.');
    }
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
    newPackage.save();
    return newPackage;
  }

  async changePackage(
    name: string,
    price: number,
    status: string,
  ): Promise<Package> {
    const findPackage = await this.packageModel.findOne({ name }).exec();
    if (!findPackage) {
      throw new BadRequestException('Package not found.');
    }
    findPackage.price = price;
    findPackage.status = status;
    return findPackage.save();
  }
}
