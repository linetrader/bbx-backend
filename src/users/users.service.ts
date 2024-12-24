// src/users/users.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from './users.schema';
import { Wallet } from '../wallets/wallets.schema'; // Wallet 모델 임포트

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Wallet.name) private readonly walletModel: Model<Wallet>, // Wallet 모델 주입
    private readonly jwtService: JwtService,
  ) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      return null;
    }

    return user;
  }

  async findWalletId(userId: string): Promise<string | null> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user.walletId || null; // walletId가 없으면 null 반환
  }

  async getWalletAddress(walletId: string): Promise<string | null> {
    const wallet = await this.walletModel.findById(walletId).exec();
    return wallet?.address || null;
  }

  async register(userData: Partial<User>): Promise<string> {
    const { email, username, password, referrer } = userData;

    if (!password) {
      throw new BadRequestException('Password is required');
    }

    const existingUser = await this.userModel.findOne({
      $or: [{ email }, { username }],
    });
    if (existingUser) {
      if (existingUser.email === email) {
        throw new BadRequestException('Email already exists');
      }
      if (existingUser.username === username) {
        throw new BadRequestException('Username already exists');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new this.userModel({
      ...userData,
      password: hashedPassword,
      referrer: referrer || null,
    });
    await newUser.save();

    return 'User registered successfully!';
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ token: string; userId: string }> {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new BadRequestException('Email not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Incorrect password');
    }

    const token = this.jwtService.sign({
      id: (user._id as any).toString(),
      email: user.email,
    });

    return { token, userId: (user._id as any).toString() };
  }
}
