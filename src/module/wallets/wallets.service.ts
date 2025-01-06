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
import { Wallet } from './wallets.schema';
import { JwtService } from '@nestjs/jwt';
import { WalletsGateway } from './wallets.gateway';
import { TransactionService } from 'src/module/transaction/transaction.service';
import { GoogleOTPService } from 'src/module/google-otp/google-otp.service';
//import { MonitoringService } from './monitoring/monitoring.service';

@Injectable()
export class WalletsService {
  constructor(
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<Wallet & Document>,
    private readonly transactionService: TransactionService,
    private readonly jwtService: JwtService,
    private readonly walletsGateway: WalletsGateway,
    private readonly googleOtpService: GoogleOTPService,
    //private readonly monitoringService: MonitoringService,
  ) {
    //this.monitoringService.startMonitoringDeposits();
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
    console.log('[DEBUG] createWallet called with user:', user);

    if (!user || !user.id) {
      console.error('[ERROR] User is not authenticated');
      throw new UnauthorizedException('User is not authenticated');
    }

    const existingWallet = await this.walletModel
      .findOne({ userId: user.id })
      .exec();
    if (existingWallet) {
      console.log(`[DEBUG] Wallet already exists for user ${user.id}`);
      return existingWallet;
    }

    console.log('[DEBUG] Creating new wallet');

    const wallet = ethers.Wallet.createRandom();
    const newWallet = await this.walletModel.create({
      address: wallet.address,
      whithdrawAddress: '0x', // 명시적으로 기본값 제공
      userId: user.id,
      usdtBalance: 0,
    });

    console.log('[DEBUG] Saving private key');
    this.savePrivateKeyToFile(String(newWallet._id), wallet.privateKey);

    console.log('[DEBUG] Wallet created successfully:', newWallet);
    return newWallet;
  }
}
