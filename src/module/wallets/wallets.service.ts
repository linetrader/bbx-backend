// src/wallets/wallets.service.ts

import * as fs from 'fs';
import * as path from 'path';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Document } from 'mongoose';
import { ethers } from 'ethers';
import { Wallet, WalletsAdmin } from './wallets.schema';
import { GoogleOTPService } from 'src/module/google-otp/google-otp.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class WalletsService {
  constructor(
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<Wallet & Document>,
    private readonly googleOtpService: GoogleOTPService,
    private readonly usersService: UsersService,
  ) {}

  private savePrivateKeyToFile(walletId: string, privateKey: string): void {
    try {
      const filePath = path.resolve(process.cwd(), 'privateKey.json');

      const existingData = fs.existsSync(filePath)
        ? JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        : {};

      existingData[walletId] = privateKey;

      fs.writeFileSync(
        filePath,
        JSON.stringify(existingData, null, 2),
        'utf-8',
      );
    } catch (error) {
      console.error('Error saving private key to file:', error);
      throw new BadRequestException('Failed to save private key.');
    }
  }

  async findWalletById(userId: string) {
    console.log('findWalletById - userId', userId);
    const wallet = await this.walletModel.findOne({ userId }).exec();
    console.log('findWalletById - wallet', wallet);
    return wallet;
  }

  async saveWithdrawAddress(
    user: { id: string; email: string },
    newAddress: string,
    otp: string,
  ): Promise<boolean> {
    //console.log('[DEBUG] saveWithdrawAddress called');
    //console.log('[DEBUG] Input user:', user);
    //console.log('[DEBUG] Input newAddress:', newAddress);
    //console.log('[DEBUG] Input otp:', otp);

    if (!user || !user.id || !user.email) {
      console.error('[ERROR] User not found or invalid user object');
      throw new BadRequestException('User not found.');
    }

    try {
      const wallet = await this.walletModel.findOne({ userId: user.id }).exec();
      //console.log('[DEBUG] Retrieved wallet:', wallet);

      if (!wallet) {
        console.warn(`[WARNING] No wallet found for user ${user.id}`);
        throw new BadRequestException(
          'Wallet not found. Please create a wallet.',
        );
      }

      const isValidOtp = await this.googleOtpService.verifyOnly(
        { email: user.email },
        otp,
      );
      //console.log('[DEBUG] OTP validation result:', isValidOtp);

      if (!isValidOtp) {
        console.error('[ERROR] Invalid OTP provided');
        throw new UnauthorizedException('Invalid OTP.');
      }

      wallet.whithdrawAddress = newAddress;
      //console.log('[DEBUG] Updated wallet withdrawAddress:',wallet.whithdrawAddress,);

      await wallet.save();
      //console.log('[DEBUG] Wallet saved successfully');

      return true;
    } catch (error) {
      console.error('[ERROR] saveWithdrawAddress failed:', error);
      throw error; // Re-throw the error to ensure it propagates correctly
    }
  }

  async getWalletInfo(user: { id: string }): Promise<Wallet> {
    if (!user || !user.id) {
      throw new UnauthorizedException('User is not authenticated');
    }

    const wallet = await this.walletModel.findOne({ userId: user.id }).exec();

    if (!wallet) {
      console.log(`Wallet not found for user ${user.id}`);
      throw new BadRequestException('Wallet not found');
    }

    return wallet;
  }

  async createWallet(user: { id: string }): Promise<Wallet> {
    //console.log('[DEBUG] createWallet called with user:', user);

    if (!user || !user.id) {
      console.error('[ERROR] User is not authenticated');
      throw new UnauthorizedException('User is not authenticated');
    }

    const existingWallet = await this.walletModel
      .findOne({ userId: user.id })
      .exec();
    if (existingWallet) {
      //console.log(`[DEBUG] Wallet already exists for user ${user.id}`);
      return existingWallet;
    }

    //console.log('[DEBUG] Creating new wallet');

    const wallet = ethers.Wallet.createRandom();
    const newWallet = await this.walletModel.create({
      address: wallet.address,
      whithdrawAddress: '0x', // 명시적으로 기본값 제공
      userId: user.id,
      usdtBalance: 0,
    });

    //console.log('[DEBUG] Saving private key');
    this.savePrivateKeyToFile(String(newWallet._id), wallet.privateKey);

    //console.log('[DEBUG] Wallet created successfully:', newWallet);
    return newWallet;
  }

  // 페이징 처리된 지갑 데이터 가져오기
  async getWalletsAdmin(
    limit: number,
    offset: number,
    user: { id: string },
  ): Promise<{ data: WalletsAdmin[]; totalWallets: number }> {
    // 1. 요청 사용자가 어드민인지 확인
    const requestingUser = await this.usersService.isValidAdmin(user.id);
    if (!requestingUser) {
      throw new BadRequestException(
        'Unauthorized: Access is restricted to admins only.',
      );
    }

    // 2. 현재 사용자(user.id) 산하의 페이징된 userIds와 총 회원 수 가져오기
    const userIds = await this.usersService.getUserIdsUnderMyNetwork(user.id);

    // 3. userIds를 기준으로 지갑 정보 검색
    const wallets = await this.walletModel
      .find({ userId: { $in: userIds } })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .exec();

    // 4. 지갑 수량 계산
    const totalWallets = await this.walletModel
      .countDocuments({ userId: { $in: userIds } })
      .exec();

    // 5. 지갑 데이터를 WalletsAdmin 형식으로 변환
    const data = await Promise.all(
      wallets.map(async (wallet) => {
        const username = await this.usersService.getUserName(wallet.userId);
        return {
          id: wallet.id,
          username: username || 'Unknown',
          address: wallet.address,
          whithdrawAddress: wallet.whithdrawAddress || '',
          usdtBalance: wallet.usdtBalance || 0.0,
          createdAt: wallet.createdAt,
          updatedAt: wallet.updatedAt,
        };
      }),
    );

    // 5. 반환
    return { data, totalWallets: totalWallets };
  }
}
