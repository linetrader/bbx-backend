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
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WalletsGateway } from './wallets.gateway';
import { TransactionService } from 'src/module/transaction/transaction.service';
import { GoogleOTPService } from 'src/module/google-otp/google-otp.service';

@Injectable()
export class WalletsService {
  private readonly bscScanApiUrl: string;
  private readonly bscUsdtContractAddress: string;
  private readonly bscScanApiKey: string;
  private readonly privateKeyFilePath: string;

  constructor(
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<Wallet & Document>,
    private readonly transactionService: TransactionService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly walletsGateway: WalletsGateway,
    private readonly googleOtpService: GoogleOTPService,
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

    this.startMonitoringDeposits();
  }

  private async startMonitoringDeposits(): Promise<void> {
    setInterval(async () => {
      const wallets = await this.walletModel.find().exec();

      for (const wallet of wallets) {
        try {
          const { balance: currentBalanceRaw, transactionHash: hash } =
            await this.getUSDTBalanceBscScan(wallet);

          // 소수점 6자리에서 자르기
          const currentBalance = parseFloat(currentBalanceRaw.toFixed(6));
          const previousBalance = parseFloat(wallet.usdtBalance.toFixed(6));

          if (currentBalance !== previousBalance) {
            wallet.usdtBalance = currentBalance;
            await wallet.save();

            const amountDeposited = parseFloat(
              (currentBalance - previousBalance).toFixed(6),
            );

            if (amountDeposited > 0) {
              if (wallet._id) {
                const tempWalletId = wallet._id.toString();
                await this.transactionService.createTransaction({
                  type: 'deposit',
                  amount: amountDeposited,
                  token: 'USDT',
                  transactionHash: hash,
                  userId: wallet.userId,
                  walletId: tempWalletId,
                });
              }

              this.walletsGateway.notifyDeposit(
                wallet.address,
                amountDeposited,
              );
            }
          }
        } catch (error) {
          console.error(`Error monitoring wallet ${wallet.address}:`, error);
        }
      }
    }, 120000); // 120 seconds interval
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

  async findWalletById(userId: string): Promise<Wallet | null> {
    const wallet = await this.walletModel.findOne({ userId }).exec();
    if (!wallet) {
      return null;
    }

    return wallet;
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

  async getTransactionsByAddress(address: string): Promise<any[]> {
    if (!address) {
      throw new BadRequestException('Wallet address is required.');
    }

    try {
      const response = await axios.get(this.bscScanApiUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
        },
        params: {
          module: 'account',
          action: 'txlist',
          address,
          startblock: 0,
          endblock: 99999999,
          sort: 'desc',
          apikey: this.bscScanApiKey,
        },
      });

      if (response.data.status !== '1') {
        // console.warn(
        //   `Failed to fetch transactions for address ${address}. Response:`,
        //   response.data,
        // );
        // No transactions found
        return [];
      }

      return response.data.result;
    } catch (error: any) {
      console.error(
        `Error fetching transactions for wallet ${address}:`,
        error.message,
      );

      if (error.response) {
        console.error('API Response Error:', error.response.data);
      }

      throw new BadRequestException('Failed to fetch transactions.');
    }
  }

  async getUSDTBalanceBscScan(
    wallet: Wallet,
  ): Promise<{ balance: number; transactionHash: string }> {
    if (!wallet || !wallet.address) {
      throw new BadRequestException(
        'Wallet object is invalid or address is missing.',
      );
    }

    try {
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

      const balanceInWei = response.data.result;
      const decimals = 18;
      const formattedBalance =
        Math.floor((parseFloat(balanceInWei) / 10 ** decimals) * 1e6) / 1e6; // 6자리 정밀도 유지

      const logsResponse = await this.getTransactionsByAddress(wallet.address);
      const latestTransaction = logsResponse[0];
      const transactionHash = latestTransaction?.hash || 'unknown-hash';

      return { balance: formattedBalance, transactionHash };
    } catch (error) {
      console.error(`Error occurred: ${(error as Error).message}`);
      throw new BadRequestException('Failed to fetch USDT balance.');
    }
  }
}
