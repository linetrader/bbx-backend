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
import { checkAdminAccess, checkUserAuthentication } from '../../utils/utils';

@Injectable()
export class WalletsService implements OnModuleInit {
  constructor(
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<Wallet & Document>,
    private readonly googleOtpService: GoogleOTPService,
    private readonly usersService: UsersService,
  ) {}

  async onModuleInit() {
    //await this.InitializeWallets();
  }

  private async InitializeWallets(): Promise<void> {
    try {
      console.log('[INFO] Checking for wallets without bnbBalance field...');

      const walletsToUpdate = await this.walletModel
        .find({ bnbBalance: { $exists: false } })
        .exec();

      console.log(
        `[INFO] Found ${walletsToUpdate.length} wallets without bnbBalance.`,
      );

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
      const wallet = await this.walletModel.findOne({ userId }).exec();
      return wallet;
    } catch (error) {
      console.error('Error in findWalletById:', error);
      throw error;
    }
  }

  async findWalletIdByAddress(address: string): Promise<string | null> {
    try {
      const wallet = await this.walletModel.findOne({ address }).exec();
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
    checkUserAuthentication(user);

    if (!user || !user.id || !user.email) {
      throw new BadRequestException('User not found.');
    }

    try {
      const wallet = await this.walletModel.findOne({ userId: user.id }).exec();

      if (!wallet) {
        throw new BadRequestException(
          'Wallet not found. Please create a wallet.',
        );
      }

      const isValidOtp = await this.googleOtpService.verifyOnly(
        { email: user.email },
        otp,
      );

      if (!isValidOtp) {
        throw new UnauthorizedException('Invalid OTP.');
      }

      wallet.whithdrawAddress = newAddress;

      await wallet.save();

      return true;
    } catch (error) {
      console.error('[ERROR] saveWithdrawAddress failed:', error);
      throw error;
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
    checkUserAuthentication(user);

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
    if (!user || !user.id) {
      throw new UnauthorizedException('User is not authenticated');
    }

    const existingWallet = await this.walletModel
      .findOne({ userId: user.id })
      .exec();
    if (existingWallet) {
      return existingWallet;
    }

    const wallet = ethers.Wallet.createRandom();
    const newWallet = await this.walletModel.create({
      address: wallet.address,
      whithdrawAddress: '0x',
      userId: user.id,
      bnbBalance: 0.0,
      usdtBalance: 0.0,
    });

    this.savePrivateKeyToFile(String(newWallet._id), wallet.privateKey);

    return newWallet;
  }

  async getWalletsAdmin(
    limit: number,
    offset: number,
    user: { id: string },
  ): Promise<{ data: WalletsAdmin[]; totalWallets: number }> {
    await checkAdminAccess(this.usersService, user.id);

    const requestingUser = await this.usersService.isValidAdmin(user.id);
    if (!requestingUser) {
      throw new BadRequestException(
        'Unauthorized: Access is restricted to admins only.',
      );
    }

    const userIds = await this.usersService.getUserIdsUnderMyNetwork(user.id);

    const wallets = await this.walletModel
      .find({ userId: { $in: userIds } })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .exec();

    const totalWallets = await this.walletModel
      .countDocuments({ userId: { $in: userIds } })
      .exec();

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

    return { data, totalWallets: totalWallets };
  }

  async updateWalletDetails(
    userId: string,
    walletId: string,
    updates: Partial<Wallet>,
  ): Promise<string> {
    try {
      const isAdmin = await this.usersService.isValidAdmin(userId);
      if (!isAdmin) {
        throw new UnauthorizedException('Unauthorized: Admin access only');
      }

      const wallet = await this.walletModel.findById(walletId).exec();
      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }

      const fieldsToUpdate: Array<keyof Wallet> = [
        'whithdrawAddress',
        'usdtBalance',
      ];

      for (const field of fieldsToUpdate) {
        const value = updates[field];
        if (value !== undefined && value !== null) {
          (wallet[field] as any) = value;
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
    const wallet = await this.findWalletById(userId);
    if (wallet) {
      wallet.usdtBalance += profit;
      wallet.save();
      return true;
    }
    return false;
  }
}
