import { Module } from '@nestjs/common';
import { TokenTransferService } from './token-transfer.service';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [WalletsModule],
  providers: [TokenTransferService],
  exports: [TokenTransferService],
})
export class TokenTransferModule {}
