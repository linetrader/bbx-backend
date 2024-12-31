// src/module/wallets/bscscan/bscscan.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { Wallet } from '../wallets.schema';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BscScanService {
  private readonly bscScanApiUrl: string;
  private readonly bscUsdtContractAddress: string;
  private readonly bscScanApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.bscScanApiUrl =
      this.configService.get<string>('BSC_SCAN_API_URL') || '';
    this.bscUsdtContractAddress =
      this.configService.get<string>('BSC_USDT_CONTRACT_ADDRESS') || '';
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
    } catch (error) {
      throw new BadRequestException('Failed to fetch transactions.');
    }
  }
}
