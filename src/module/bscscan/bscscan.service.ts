// src/module/wallets/bscscan/bscscan.service.ts

import axios from 'axios';
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { TransactionService } from '../transaction/transaction.service';
import { Wallet } from '../wallets/wallets.schema';
import { TokenTransferService } from '../token-transfer/token-transfer.service';

@Injectable()
export class BscScanService {
  private readonly bscScanApiUrl: string;
  private readonly bscUsdtContractAddress: string;
  private readonly bscScanApiKey: string;

  constructor(
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<Wallet>,
    private readonly configService: ConfigService,
    private readonly transactionService: TransactionService,
    private readonly tokenTransferService: TokenTransferService,
  ) {
    this.bscScanApiUrl = this.configService.get<string>('BSC_API_URL') || '';
    this.bscUsdtContractAddress =
      this.configService.get<string>('BSC_USDT_CONTRACT_ADDRESS') || '';
    this.bscScanApiKey =
      this.configService.get<string>('BSC_SCAN_API_KEY') || '';
  }

  async getLatestTransaction(
    wallet: Wallet,
  ): Promise<{ balance: number; transactionHash: string }> {
    if (!wallet?.address) {
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
        const { balance, transactionHash } =
          await this.getLatestTransaction(wallet);

        if (!transactionHash) {
          continue;
        }

        const isDuplicate =
          await this.transactionService.checkTransactionHashExists(
            transactionHash,
          );
        if (isDuplicate) {
          continue;
        }

        const amountDeposited = balance;
        const totalBalance = wallet.usdtBalance + amountDeposited;

        wallet.usdtBalance = totalBalance;
        await wallet.save();

        if (wallet.id) {
          await this.transactionService.createTransaction({
            type: 'deposit',
            amount: amountDeposited,
            token: 'USDT',
            transactionHash,
            userId: wallet.userId,
            walletId: wallet.id,
          });
        }

        const bnbBalance = await this.tokenTransferService.getBnbBalance(
          wallet.address,
        );
        console.log(
          `[INFO] Wallet ${wallet.address} BNB Balance: ${bnbBalance}`,
        );

        if (bnbBalance <= 0.0002) {
          console.log(
            `[INFO] Low BNB balance. Sending 0.001 BNB to ${wallet.address}`,
          );
          const success = await this.tokenTransferService.transferBnb(
            wallet.address,
            0.001,
          );
          if (success) {
            console.log(
              `[INFO] Successfully sent 0.001 BNB to ${wallet.address}`,
            );
          } else {
            console.error(
              `[ERROR] Failed to send 0.001 BNB to ${wallet.address}`,
            );
          }
        } else {
          if (wallet.bnbBalance !== bnbBalance) {
            wallet.bnbBalance = bnbBalance;
            await wallet.save();
          }
        }
      } catch (error) {
        console.error(`Error monitoring wallet ${wallet.address}:`, error);
      }
    }
  }
}
