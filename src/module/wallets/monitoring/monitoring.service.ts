// src/module/wallets/monitoring/monitoring.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import { Wallet } from '../wallets.schema';
import { BscScanService } from '../bscscan/bscscan.service';
import { WalletsGateway } from '../wallets.gateway';
//import { TransactionService } from '../transactions/transaction.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TransactionService } from 'src/module/transaction/transaction.service';

@Injectable()
export class MonitoringService {
  constructor(
    @InjectModel(Wallet.name) private readonly walletModel: Model<Wallet>,
    private readonly bscScanService: BscScanService,
    private readonly walletsGateway: WalletsGateway,
    private readonly transactionService: TransactionService,
  ) {}

  async testMonitoring() {
    const testMsg = 'aaaaaaaaaa';
    const amountDeposited = 0.01;
    setInterval(async () => {
      //for (const wallet of wallets) {}
      this.walletsGateway.notifyDeposit(testMsg, amountDeposited);
    }, 60000);
  }

  async startMonitoringDeposits(): Promise<void> {
    setInterval(async () => {
      const wallets = await this.walletModel.find().exec();

      for (const wallet of wallets) {
        try {
          // 3. 최근 트랜잭션 1개 가져오기
          const { balance, transactionHash } =
            await this.bscScanService.getLatestTransaction(wallet);

          if (!transactionHash) {
            //console.log(
            // `No new transaction detected for wallet ${wallet.address}`,
            //);
            continue;
          }

          // 5. DB에 트랜잭션 해시 중복 체크
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

          // 6. 새로운 트랜잭션 처리 및 DB 업데이트
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
          this.walletsGateway.notifyDeposit(wallet.address, amountDeposited);

          //console.log(
          //  `New deposit detected. Amount: ${amountDeposited}, Hash: ${transactionHash}`,
          //);
        } catch (error) {
          console.error(`Error monitoring wallet ${wallet.address}:`, error);
        }
      }
    }, 120000); // 2-minute interval
  }
}
