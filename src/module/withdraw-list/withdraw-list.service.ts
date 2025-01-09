// src/withdraw-list/withdraw-list.service.ts

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WithdrawList } from './withdraw-list.schema';
import { GoogleOTPService } from '../google-otp/google-otp.service';
import { UsersService } from 'src/module/users/users.service';
//import { TransactionService } from 'src/module/transaction/transaction.service';
//import { WalletsService } from '../wallets/wallets.service';
//import { JwtService } from '@nestjs/jwt';
import { PackageUsersService } from '../package-users/package-users.service';
import { GetPendingWithdrawalsResponse } from './dto/get-pending-withdrawals-response.dto';

@Injectable()
export class WithdrawListService implements OnModuleInit {
  constructor(
    @InjectModel(WithdrawList.name)
    private readonly withdrawListModel: Model<WithdrawList>,

    private readonly googleOtpService: GoogleOTPService,
    //private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    //private readonly transactionService: TransactionService,
    //private readonly walletService: WalletsService,
    private readonly packageUsersService: PackageUsersService,
  ) {}
  /**
   * 모듈 초기화 시 호출
   */
  async onModuleInit() {
    console.log('WithdrawListService - onModuleInit');
  }

  async getPendingWithdrawalsAdmin(
    limit: number,
    offset: number,
    user: { id: string },
  ): Promise<GetPendingWithdrawalsResponse[]> {
    const requestingUser = await this.usersService.findUserById(user.id);

    if (!requestingUser || requestingUser.userLevel > 3) {
      throw new BadRequestException(
        'Unauthorized: Access is restricted to admins only.',
      );
    }

    const withdrawals = await this.withdrawListModel
      .find({ status: 'pending' }) // "pending" 상태의 데이터 필터링
      .sort({ createdAt: -1 }) // 최신순 정렬
      .skip(offset)
      .limit(limit)
      .exec();

    return Promise.all(
      withdrawals.map(async (withdrawal) => {
        const username = await this.usersService.getUserNameByEmail(
          withdrawal.email,
        );
        return {
          id: withdrawal.id,
          username: username || 'Unknown',
          currency: withdrawal.currency,
          amount: withdrawal.amount,
          createdAt: withdrawal.createdAt,
          updatedAt: withdrawal.updatedAt,
        };
      }),
    );
  }

  async getTotalPendingWithdrawals(): Promise<number> {
    return this.withdrawListModel.countDocuments({ status: 'pending' }).exec();
  }

  // email을 파라미터로 받아서 Pending Withdrawals 처리
  async getPendingWithdrawals(email: string): Promise<WithdrawList[]> {
    //console.log('getPendingWithdrawals - emil', email);
    if (!email) {
      throw new UnauthorizedException('Email not found in user context.');
    }

    const pendingWithdrawals = await this.withdrawListModel
      .find({ email, status: 'pending' })
      .exec();

    if (!pendingWithdrawals) {
      throw new BadRequestException('No pending withdrawals found.');
    }

    return pendingWithdrawals;
  }

  // email을 파라미터로 받아서 출금 요청 처리
  async processWithdrawalRequest(
    userId: string,
    email: string,
    currency: string,
    amount: number,
    otp: string,
  ): Promise<boolean> {
    if (!email) {
      console.log('Email not found in user context.');
      throw new UnauthorizedException('Email not found in user context.');
    }

    // OTP 검증
    const isValidOtp = await this.googleOtpService.verifyOnly({ email }, otp);
    //console.log('isValidOtp', isValidOtp);
    if (!isValidOtp) {
      console.log('Invalid OTP.');
      throw new UnauthorizedException('Invalid OTP.');
    }

    //console.log('otp', otp);

    // 지갑 자산 차감
    const walletUpdateResult = await this.deductFromWallet(
      userId,
      currency,
      amount,
    );
    if (!walletUpdateResult) {
      throw new BadRequestException('Failed to deduct balance from wallet.');
    }

    // 출금 요청 DB에 저장
    const withdrawal = new this.withdrawListModel({
      email,
      currency,
      amount,
      status: 'pending',
    });

    await withdrawal.save();
    return true;
  }

  // 출금 승인 처리
  async approveWithdrawal(
    withdrawalId: string,
    email: string,
  ): Promise<boolean> {
    const admin = await this.usersService.findUserByEmail(email);

    if (!admin || (admin.userLevel !== 1 && admin.userLevel !== 2)) {
      throw new UnauthorizedException(
        'Only admin users can approve withdrawals.',
      );
    }

    const withdrawal = await this.withdrawListModel.findById(withdrawalId);
    if (!withdrawal || withdrawal.status !== 'pending') {
      throw new BadRequestException(
        'Invalid or already processed withdrawal request.',
      );
    }

    withdrawal.status = 'approved';
    await withdrawal.save();

    return true;
  }

  // 출금 거부 처리
  async rejectWithdrawal(
    withdrawalId: string,
    email: string,
  ): Promise<boolean> {
    const admin = await this.usersService.findUserByEmail(email);

    if (!admin || (admin.userLevel !== 1 && admin.userLevel !== 2)) {
      throw new UnauthorizedException(
        'Only admin users can reject withdrawals.',
      );
    }

    const withdrawal = await this.withdrawListModel.findById(withdrawalId);
    if (!withdrawal || withdrawal.status !== 'pending') {
      throw new BadRequestException(
        'Invalid or already processed withdrawal request.',
      );
    }

    withdrawal.status = 'rejected';
    await withdrawal.save();

    return true;
  }

  // 지갑에서 금액 차감
  private async deductFromWallet(
    userId: string,
    currency: string,
    amount: number,
  ): Promise<boolean> {
    try {
      const walletUpdateResult = await this.packageUsersService.adjustBalance(
        userId,
        currency,
        amount,
      );

      if (!walletUpdateResult) {
        throw new BadRequestException(
          `Failed to deduct ${amount} ${currency} from wallet.`,
        );
      }

      return true;
    } catch {
      throw new BadRequestException(`Insufficient balance.`);
    }
  }
}
