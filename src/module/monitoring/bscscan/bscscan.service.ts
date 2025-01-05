// src/module/wallets/bscscan/bscscan.service.ts

import axios from 'axios';
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { TransactionService } from '../../transaction/transaction.service';
import { Wallet } from '../../wallets/wallets.schema';

@Injectable()
export class BscScanService {
  private readonly bscScanApiUrl: string;
  private readonly bscUsdtContractAddress: string;
  private readonly bscScanApiKey: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<Wallet>, // walletModel 정의
    private readonly transactionService: TransactionService, // transactionService 정의
  ) {
    const bscEnv = this.configService.get<string>('BSC_ENV', 'testnet'); // 기본값은 mainnet

    if (bscEnv === 'testnet') {
      this.bscScanApiUrl =
        this.configService.get<string>('BSC_TESTNET_API_URL') || '';
      this.bscUsdtContractAddress =
        this.configService.get<string>('BSC_TESTNET_USDT_CONTRACT_ADDRESS') ||
        '';
    } else {
      this.bscScanApiUrl =
        this.configService.get<string>('BSC_MAINNET_API_URL') || '';
      this.bscUsdtContractAddress =
        this.configService.get<string>('BSC_MAINNET_USDT_CONTRACT_ADDRESS') ||
        '';
    }

    this.bscScanApiKey =
      this.configService.get<string>('BSC_SCAN_API_KEY') || '';
  }

  async getLatestTransaction(
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
          action: 'tokentx',
          contractaddress: this.bscUsdtContractAddress,
          address: wallet.address,
          startblock: 0,
          endblock: 99999999,
          sort: 'desc',
          apikey: this.bscScanApiKey,
        },
      });

      if (response.data.status !== '1') {
        return { balance: 0, transactionHash: '' };
      }

      const transactions = response.data.result;

      // 4. 가장 최근 트랜잭션 가져오기 (입금만)
      const latestDeposit = transactions.find(
        (tx: any) => tx.to.toLowerCase() === wallet.address.toLowerCase(),
      );

      if (!latestDeposit) {
        return { balance: 0, transactionHash: '' };
      }

      const decimals = 18;
      const balance =
        Math.floor((parseFloat(latestDeposit.value) / 10 ** decimals) * 1e6) /
        1e6;

      return { balance, transactionHash: latestDeposit.hash };
    } catch {
      throw new BadRequestException('Failed to fetch transactions.');
    }
  }

  async monitoringDeposits(): Promise<void> {
    const wallets = await this.walletModel.find().exec();

    for (const wallet of wallets) {
      try {
        // 1. 최근 트랜잭션 1개 가져오기
        const { balance, transactionHash } =
          await this.getLatestTransaction(wallet);

        if (!transactionHash) {
          //console.log(
          // `No new transaction detected for wallet ${wallet.address}`,
          //);
          continue;
        }

        // 2. DB에 트랜잭션 해시 중복 체크
        const isDuplicate =
          await this.transactionService.checkTransactionHashExists(
            transactionHash,
          );

        if (isDuplicate) {
          //console.log(
          //  `Duplicate transaction hash detected: ${transactionHash}`,
          //);
          continue;
        }

        // 3. 새로운 트랜잭션 처리 및 DB 업데이트
        const amountDeposited = balance;
        const totalBalance = wallet.usdtBalance + amountDeposited;
        console.log('amountDeposited : ', amountDeposited);
        console.log('wallet.usdtBalance : ', wallet.usdtBalance);
        console.log('totalBalance : ', totalBalance);

        wallet.usdtBalance = totalBalance;

        await wallet.save();

        if (wallet._id) {
          await this.transactionService.createTransaction({
            type: 'deposit',
            amount: amountDeposited,
            token: 'USDT',
            transactionHash,
            userId: wallet.userId,
            walletId: wallet._id.toString(),
          });
        }

        // Notify user about the deposit
        //this.walletsGateway.notifyDeposit(wallet.address, amountDeposited);

        //console.log(
        //  `New deposit detected. Amount: ${amountDeposited}, Hash: ${transactionHash}`,
        //);
      } catch (error) {
        console.error(`Error monitoring wallet ${wallet.address}:`, error);
      }
    }
  }
}
