// src/withdraw-list/withdraw-list.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WithdrawListResolver } from './withdraw-list.resolver';
import { WithdrawListService } from './withdraw-list.service';
import { WithdrawList, WithdrawListSchema } from './withdraw-list.schema';
import { GoogleOTPModule } from '../google-otp/google-otp.module';
import { UsersModule } from '../users/users.module';
import { TransactionModule } from '../transaction/transaction.module';
import { WalletsModule } from 'src/module/wallets/wallets.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WithdrawList.name, schema: WithdrawListSchema },
    ]),
    GoogleOTPModule, // GoogleOTPModule 추가
    UsersModule,
    TransactionModule,
    WalletsModule,
  ],
  providers: [WithdrawListResolver, WithdrawListService],
})
export class WithdrawListModule {}
