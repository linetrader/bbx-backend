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
import { MonitoringService } from './monitoring/monitoring.service';

// src/wallets/wallets.service.ts

@Injectable()
export class WalletsService {
  constructor(
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<Wallet & Document>,
    private readonly transactionService: TransactionService,
    private readonly jwtService: JwtService,
    private readonly walletsGateway: WalletsGateway,
    private readonly googleOtpService: GoogleOTPService,
    private readonly monitoringService: MonitoringService,
  ) {
    this.monitoringService.startMonitoringDeposits();
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
    const wallet = await this.walletModel.findOne({ userId: user.id }).exec();
    if (!wallet) {
      console.log(`No wallet found for user ${user.id}`);
      throw new BadRequestException(
        'Wallet not found. Please create a wallet.',
      );
    }

    const isValidOtp = await this.googleOtpService.verifyOnly(user, otp);
    if (!isValidOtp) {
      throw new UnauthorizedException('Invalid OTP.');
    }

    wallet.whitdrawAddress = newAddress;
    await wallet.save();

    return true;
  }

  async getWalletInfo(user: { id: string }): Promise<Wallet> {
    if (!user || !user.id) {
      throw new UnauthorizedException('User is not authenticated');
    }

    const wallet = await this.walletModel.findOne({ userId: user.id }).exec();

    if (!wallet) {
      //console.log(`Wallet not found for user ${user.id}`);
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
      console.log(`Wallet already exists for user ${user.id}`);
      return existingWallet;
    }

    const wallet = ethers.Wallet.createRandom();
    const newWallet = await this.walletModel.create({
      address: wallet.address,
      whitdrawAddress: '0x', // Placeholder address
      userId: user.id,
      usdtBalance: 0,
      dogeBalance: 0,
      btcBalance: 0,
    });

    this.savePrivateKeyToFile(String(newWallet._id), wallet.privateKey);

    return newWallet;
  }
}
