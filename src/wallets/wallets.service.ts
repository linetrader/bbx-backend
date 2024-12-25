// src/wallet/wallet.service.ts

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
import { User } from '../users/users.schema';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class WalletsService {
  private readonly bscScanApiUrl: string;
  private readonly bscUsdtContractAddress: string;
  private readonly bscScanApiKey: string;
  private readonly privateKeyFilePath: string;

  constructor(
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<Wallet & Document>,
    @InjectModel(User.name)
    private readonly userModel: Model<User & Document>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.bscScanApiUrl =
      this.configService.get<string>('BSC_SCAN_API_URL') || '';
    this.bscUsdtContractAddress =
      this.configService.get<string>('BSC_USDT_CONTRACT_ADDRESS') || '';
    this.bscScanApiKey =
      this.configService.get<string>('BSC_SCAN_API_KEY') || '';

    this.privateKeyFilePath =
      path.join(__dirname, '..', 'privateKey.json') || '';

    if (
      !this.bscScanApiUrl ||
      !this.bscUsdtContractAddress ||
      !this.bscScanApiKey
    ) {
      throw new BadRequestException(
        'Missing necessary BSC configuration in environment variables.',
      );
    }
  }

  private savePrivateKeyToFile(walletId: string, privateKey: string): void {
    try {
      const filePath = this.privateKeyFilePath;

      // 기존 데이터 읽기 (파일이 존재하지 않으면 빈 객체로 시작)
      const existingData = fs.existsSync(filePath)
        ? JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        : {};

      // 새로운 데이터 추가
      existingData[walletId] = privateKey;

      // 병합된 데이터를 다시 파일에 저장
      fs.writeFileSync(
        filePath,
        JSON.stringify(existingData, null, 2),
        'utf-8',
      );

      console.log('Private key saved successfully for walletId:', walletId);
    } catch (error) {
      console.error('Error saving private key to file:', error);
      throw new BadRequestException('Failed to save private key.');
    }
  }

  verifyToken(token: string): { id: string; email: string } {
    try {
      return this.jwtService.verify(token) as { id: string; email: string };
    } catch (err) {
      console.error('Token verification failed:', err); // 에러 로그
      throw new BadRequestException('Invalid or expired token.');
    }
  }

  async findWalletById(userId: string): Promise<Wallet | null> {
    const wallet = await this.walletModel.findOne({ userId }).exec();
    if (!wallet) {
      return null;
    }

    return wallet;
  }

  async getWalletInfo(authHeader: string): Promise<Wallet> {
    const token = authHeader.split(' ')[1];
    const decoded = this.verifyToken(token);
    const userId = decoded.id;

    console.log('WalletService - Decoded User ID:', userId);

    const wallet = await this.walletModel.findOne({ userId }).exec();
    if (!wallet) {
      throw new BadRequestException('Wallet not found.');
    }

    console.log('Wallet found:', wallet);
    return wallet;
  }

  async createWallet(
    authHeader: string,
    user?: { id?: string; mode?: string },
  ): Promise<Wallet> {
    if (user?.mode === 'login') {
      const newToken = this.jwtService.sign({
        id: 'new_user_id',
        email: 'user@example.com',
      });
      console.log('Generated New Token:', newToken);
      throw new UnauthorizedException(`New token generated: ${newToken}`);
    }

    const token = authHeader.split(' ')[1];
    const decoded = this.jwtService.verify(token);
    const userId = decoded.id;

    const existingWallet = await this.walletModel.findOne({ userId }).exec();
    if (existingWallet) {
      return existingWallet;
    }

    const wallet = ethers.Wallet.createRandom();
    const newWallet = await this.walletModel.create({
      address: wallet.address,
      userId,
      usdtBalance: '0.0',
      btcBalance: '0.0',
    });

    this.savePrivateKeyToFile(String(newWallet._id), wallet.privateKey);

    return newWallet;
  }

  async getWalletAddress(userId: string): Promise<string | null> {
    const wallet = await this.walletModel.findOne({ userId }).exec();
    return wallet ? wallet.address : null;
  }

  async getUSDTBalanceBscScan(userId: string): Promise<string> {
    try {
      const wallet = await this.walletModel.findOne({ userId }).exec();
      if (!wallet) {
        throw new BadRequestException('not Wallet');
      }

      const response = await axios.get(this.bscScanApiUrl, {
        params: {
          module: 'account',
          action: 'tokenbalance',
          contractaddress: this.bscUsdtContractAddress,
          address: wallet.address,
          tag: 'latest',
          apikey: this.bscScanApiKey,
        },
      });

      if (response.data.status !== '1') {
        throw new BadRequestException(
          response.data.message || 'Failed to fetch data from BscScan.',
        );
      }

      // 반환된 값은 최소 단위(wei)로 제공됩니다.
      const balanceInWei = response.data.result;

      // USDT는 소수점 6자리 (decimals = 6)을 갖습니다.
      const decimals = 18;

      // 최소 단위를 토큰 단위로 변환
      const formattedBalance = (
        parseFloat(balanceInWei) /
        10 ** decimals
      ).toFixed(decimals);

      return formattedBalance;
    } catch (error: any) {
      console.error('Error fetching USDT balance:', error);
      throw new BadRequestException('Failed to fetch USDT balance.');
    }
  }
}
