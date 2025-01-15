// src/wallets/wallets.service.ts

import * as fs from 'fs';
import * as path from 'path';
import {
  BadRequestException,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Document } from 'mongoose';
import { ethers } from 'ethers';
import { Wallet, WalletsAdmin } from './wallets.schema';
import { GoogleOTPService } from 'src/module/google-otp/google-otp.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class WalletsService implements OnModuleInit {
  constructor(
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<Wallet & Document>,
    private readonly googleOtpService: GoogleOTPService,
    private readonly usersService: UsersService,
  ) {}

  async onModuleInit() {
    try {
      console.log('[INFO] Checking for wallets without bnbBalance field...');

      // bnbBalance 필드가 없는 문서를 검색
      const walletsToUpdate = await this.walletModel
        .find({ bnbBalance: { $exists: false } })
        .exec();

      console.log(
        `[INFO] Found ${walletsToUpdate.length} wallets without bnbBalance.`,
      );

      // 필드 추가 및 기본값 설정
      for (const wallet of walletsToUpdate) {
        wallet.bnbBalance = 0.0;
        await wallet.save();
        console.log(`[INFO] Updated wallet ID: ${wallet.id}`);
      }

      console.log('[INFO] Wallets updated successfully.');
    } catch (error) {
      console.error('[ERROR] Failed to update wallets:', error);
    }
  }

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

  async findWalletById(userId: string): Promise<Wallet | null> {
    try {
      //console.log('findWalletById - userId:', userId);
      const wallet = await this.walletModel.findOne({ userId }).exec();
      //console.log('findWalletById - wallet:', wallet);
      return wallet;
    } catch (error) {
      console.error('Error in findWalletById:', error);
      throw error;
    }
  }

  async findWalletIdByAddress(address: string): Promise<string | null> {
    try {
      //console.log('findWalletById - userId:', userId);
      const wallet = await this.walletModel.findOne({ address }).exec();
      //console.log('findWalletById - wallet:', wallet);
      return wallet?.id;
    } catch (error) {
      console.error('Error in findWalletById:', error);
      throw error;
    }
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

  async findWalletIdByUserId(userId: string): Promise<string> {
    const wallet = await this.walletModel.findOne({ userId }).exec();
    if (!wallet) {
      return '';
    }

    return wallet.id;
  }

  async getWalletInfo(user: { id: string }): Promise<Wallet> {
    if (!user || !user.id) {
      throw new UnauthorizedException('User is not authenticated');
    }

    //console.log('getWalletInfo - ', user.id);

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
      bnbBalance: 0.0,
      usdtBalance: 0.0,
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
          bnbBalance: wallet.bnbBalance || 0.0,
          usdtBalance: wallet.usdtBalance || 0.0,
          createdAt: wallet.createdAt,
          updatedAt: wallet.updatedAt,
        };
      }),
    );

    // 5. 반환
    return { data, totalWallets: totalWallets };
  }

  /**
   * Update wallet details service method
   */
  async updateWalletDetails(
    userId: string, // 사용자 ID
    walletId: string,
    updates: Partial<Wallet>,
  ): Promise<string> {
    try {
      // 어드민 권한 확인
      const isAdmin = await this.usersService.isValidAdmin(userId);
      if (!isAdmin) {
        throw new UnauthorizedException('Unauthorized: Admin access only');
      }

      // 월렛 검색
      const wallet = await this.walletModel.findById(walletId).exec();
      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }

      // 업데이트 가능한 필드 정의
      const fieldsToUpdate: Array<keyof Wallet> = [
        'whithdrawAddress',
        'usdtBalance',
      ];

      // 필드 업데이트 로직
      for (const field of fieldsToUpdate) {
        const value = updates[field];
        if (value !== undefined && value !== null) {
          (wallet[field] as any) = value; // 타입 강제 캐스팅
        }
      }

      await wallet.save();
      return `Wallet ${walletId} updated successfully`;
    } catch (error) {
      console.error('[ERROR] Failed to update wallet details:', error);
      throw new BadRequestException('Failed to update wallet details');
    }
  }

  async updateUsdtBalance(username: string, profit: number): Promise<boolean> {
    const userId = await this.usersService.findUserIdByUsername(username);
    //console.log('updateUsdtBalance - userId', userId);
    const wallet = await this.findWalletById(userId);
    //console.log('updateUsdtBalance - profit', profit);
    if (wallet) {
      wallet.usdtBalance += profit;
      wallet.save();
      return true;
    }
    return false;
  }
}
