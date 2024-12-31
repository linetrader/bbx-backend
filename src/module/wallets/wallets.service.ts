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
//import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WalletsGateway } from './wallets.gateway';
import { TransactionService } from 'src/module/transaction/transaction.service';
import { GoogleOTPService } from 'src/module/google-otp/google-otp.service';
import { MonitoringService } from './monitoring/monitoring.service';

@Injectable()
export class WalletsService {
  constructor(
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<Wallet & Document>,
    private readonly transactionService: TransactionService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly walletsGateway: WalletsGateway,
    private readonly googleOtpService: GoogleOTPService,
    private readonly monitoringService: MonitoringService,
  ) {
    this.monitoringService.startMonitoringDeposits();
    //this.monitoringService.testMonitoring();
  }

  private savePrivateKeyToFile(walletId: string, privateKey: string): void {
    try {
      //const filePath = this.privateKeyFilePath; // 프로덕트
      const filePath = path.resolve(process.cwd(), 'privateKey.json'); // .env 파일과 동일한 디렉토리 기준으로 경로 설정

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

  async saveWithdrawAddress(
    authHeader: string,
    newAddress: string,
    otp: string,
  ): Promise<boolean> {
    const token = authHeader.split(' ')[1];
    const decoded = this.jwtService.verify(token);
    const userId = decoded.id;

    const wallet = await this.walletModel.findOne({ userId }).exec();
    if (!wallet) {
      console.log('Wallet not found:');
      throw new BadRequestException('Wallet not found.');
    }

    // OTP 검증
    const isValidOtp = await this.googleOtpService.verifyOnly(
      decoded.email,
      otp,
    );
    if (!isValidOtp) {
      throw new UnauthorizedException('saveWithdrawAddress - Invalid OTP.');
    }

    wallet.whitdrawAddress = newAddress;
    wallet.save();

    return true;
  }

  async getWalletInfo(authHeader: string): Promise<Wallet | null> {
    try {
      if (!authHeader) {
        throw new UnauthorizedException('Authorization header is missing.');
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        throw new UnauthorizedException('Bearer token is missing.');
      }

      // 1. userId 추출
      const decoded = this.jwtService.verify(token); // JWT 토큰 검증
      const userId = decoded.id;
      if (!userId) {
        throw new UnauthorizedException('User not found.');
      }
      //console.log('WalletService - Decoded User ID:', userId);

      const wallet = await this.walletModel.findOne({ userId }).exec();
      if (!wallet) {
        console.log('Wallet not found:');
        throw new BadRequestException('Wallet not found.');
      }

      //console.log('Wallet found:', wallet);
      return wallet;
    } catch (error) {
      //throw new BadRequestException('Failed Wallet.');
      //console.log(error);
      return null;
    }
  }

  async createWallet(authHeader: string): Promise<Wallet> {
    const token = authHeader.split(' ')[1];
    const decoded = this.jwtService.verify(token);
    const userId = decoded.id;

    console.log('createWallet - userId : ', userId);

    const existingWallet = await this.walletModel.findOne({ userId }).exec();
    if (existingWallet) {
      return existingWallet;
    }

    console.log('createWallet - existingWallet : ', existingWallet);

    const wallet = ethers.Wallet.createRandom();
    const newWallet = await this.walletModel.create({
      address: wallet.address,
      whitdrawAddress: '0x',
      userId,
      usdtBalance: 0, // 초기값 숫자로 설정
      dogeBalance: 0,
      btcBalance: 0,
    });

    console.log('createWallet - newWallet : ', newWallet);

    this.savePrivateKeyToFile(String(newWallet._id), wallet.privateKey);

    return newWallet;
  }

  async getWalletAddress(userId: string): Promise<string | null> {
    const wallet = await this.walletModel.findOne({ userId }).exec();
    return wallet ? wallet.address : null;
  }
}
