import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BscScanService } from './bscscan.service';
import { Wallet, WalletSchema } from '../wallets/wallets.schema';
import { TransactionModule } from '../transaction/transaction.module';
import { TokenTransferModule } from '../token-transfer/token-transfer.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Wallet.name, schema: WalletSchema }]),
    TransactionModule,
    TokenTransferModule,
  ],

  providers: [BscScanService],
  exports: [BscScanService], // 외부 모듈에서 사용 가능하도록 exports 추가
})
export class BscScanModule {}
