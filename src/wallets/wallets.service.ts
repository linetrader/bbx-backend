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
import { Transaction } from 'src/transaction/transaction.schema';

@Injectable()
export class WalletsService {
  private readonly bscScanApiUrl: string;
  private readonly bscUsdtContractAddress: string;
  private readonly bscScanApiKey: string;
  private readonly privateKeyFilePath: string;

  constructor(
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<Wallet & Document>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction & Document>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly walletsGateway: WalletsGateway,
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

      //console.log('startMonitoringDeposits - wallets : ', wallets);

      for (const wallet of wallets) {
        try {
          const { balance: currentBalance, transactionHash: hash } =
            await this.getUSDTBalanceBscScan(wallet);
          const previousBalance = parseFloat(wallet.usdtBalance || '0').toFixed(
            6,
          );

          console.log(
            'currentBalance : ',
            currentBalance,
            'previousBalance : ',
            previousBalance,
          );

          if (currentBalance !== previousBalance) {
            // Step 2: Update DB with current balance
            wallet.usdtBalance = currentBalance;
            await wallet.save();

            // Step 3: Log deposit transaction
            const amountDeposited = (
              parseFloat(currentBalance) - parseFloat(previousBalance)
            ).toFixed(6);

            if (parseFloat(amountDeposited) > 0) {
              console.log('amountDeposited : ', amountDeposited);
              await this.transactionModel.create({
                type: 'deposit',
                amount: amountDeposited,
                token: 'USDT',
                transactionHash: hash,
                userId: wallet.userId,
                walletId: wallet._id,
              });

              // Step 4: Notify frontend
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
    } catch (error) {
      const err = error as Error; // 강제 타입 단언
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedException(
          'Token has expired. Please log in again.',
        );
      }
      throw new BadRequestException('Invalid token.');
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

    //console.log('WalletService - Decoded User ID:', userId);

    const wallet = await this.walletModel.findOne({ userId }).exec();
    if (!wallet) {
      throw new BadRequestException('Wallet not found.');
    }

    //console.log('Wallet found:', wallet);
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
      //console.log('Generated New Token:', newToken);
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
      dogeBalance: '0.0',
      btcBalance: '0.0',
    });

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
        console.warn(
          `Failed to fetch transactions for address ${address}. Response:`,
          response.data,
        );
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
  ): Promise<{ balance: string; transactionHash: string }> {
    if (!wallet || !wallet.address) {
      console.error(
        `Invalid wallet object or missing address. Wallet: ${JSON.stringify(
          wallet,
        )}`,
      );
      throw new BadRequestException(
        'Wallet object is invalid or address is missing.',
      );
    }

    try {
      // Fetch USDT balance
      const response = await axios.get(this.bscScanApiUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
        },
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
        console.warn(
          `Failed to fetch balance for wallet ${wallet.address}. Response: `,
          response.data,
        );
        throw new BadRequestException(
          response.data.message || 'Failed to fetch data from BscScan.',
        );
      }

      const balanceInWei = response.data.result;
      const decimals = 18;
      const formattedBalance = (
        parseFloat(balanceInWei) /
        10 ** decimals
      ).toFixed(6);

      // Fetch transaction logs
      const logsResponse = await this.getTransactionsByAddress(wallet.address);

      if (logsResponse.length === 0) {
        console.warn(
          `No transactions found for wallet ${wallet.address}. Returning default hash.`,
        );
        return { balance: formattedBalance, transactionHash: 'unknown-hash' };
      }

      const latestTransaction = logsResponse[0]; // Get the most recent transaction
      const transactionHash = latestTransaction?.hash || 'unknown-hash';

      console.log(
        `USDT balance for wallet ${wallet.address}: ${formattedBalance}, Transaction Hash: ${transactionHash}`,
      );
      return { balance: formattedBalance, transactionHash };
    } catch (error: any) {
      console.error(
        `Error fetching USDT balance for wallet ${wallet.address}:`,
        error.message,
      );

      if (error.response) {
        //console.error('API Response Error:', error.response.data);
        console.error('API Response Error:');
      }

      throw new BadRequestException('Failed to fetch USDT balance.');
    }
  }
}
