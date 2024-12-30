// src/withdraw-list/withdraw-list.service.ts

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WithdrawList } from './withdraw-list.schema';
import { GoogleOTPService } from '../google-otp/google-otp.service';
import { UsersService } from 'src/module/users/users.service';
import { TransactionService } from 'src/module/transaction/transaction.service';
import { WalletsService } from '../wallets/wallets.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class WithdrawListService {
  constructor(
    @InjectModel(WithdrawList.name)
    private readonly withdrawListModel: Model<WithdrawList>,
    private readonly googleOtpService: GoogleOTPService,
    private readonly userService: UsersService,
    private readonly transactionService: TransactionService,
    private readonly walletService: WalletsService, // WalletService 주입
    private readonly jwtService: JwtService,
  ) {}

  async getPendingWithdrawals(token: string): Promise<WithdrawList[]> {
    const { email } = this.jwtService.verify(token);

    const pendingWithdrawals = await this.withdrawListModel
      .find({ email, status: 'pending' })
      .exec();

    if (!pendingWithdrawals) {
      throw new BadRequestException('No pending withdrawals found.');
    }

    return pendingWithdrawals;
  }

  async processWithdrawalRequest(
    token: string,
    currency: string,
    amount: number,
    otp: string,
  ): Promise<boolean> {
    const { id: userId, email } = this.jwtService.verify(token);

    // OTP 검증
    const isValidOtp = await this.googleOtpService.verifyOnly(email, otp);
    if (!isValidOtp) {
      throw new UnauthorizedException('Withdrawal - Invalid OTP.');
    }

    console.log('processWithdrawalRequest - currency : ', currency);

    // 지갑 자산 차감
    const walletUpdateResult = await this.deductFromWallet(
      userId,
      currency,
      amount,
    );

    if (!walletUpdateResult) {
      throw new BadRequestException('Failed to deduct balance from wallet.');
    }

    // DB에 출금 요청 저장
    const withdrawal = new this.withdrawListModel({
      email,
      currency,
      amount,
      status: 'pending',
    });

    await withdrawal.save();
    return true;
  }

  async approveWithdrawal(
    withdrawalId: string,
    token: string,
  ): Promise<boolean> {
    const { id: userId } = this.jwtService.verify(token);
    const admin = await this.userService.findUserById(userId);

    // 어드민 계정 확인
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

    // 가정된 WalletService 연동
    // await this.deductFromWallet(
    //   withdrawal.email,
    //   withdrawal.currency,
    //   withdrawal.amount,
    // );

    withdrawal.status = 'approved';
    await withdrawal.save();

    // 사용자 정보 가져오기
    const user = await this.userService.findUserByEmail(withdrawal.email);
    if (!user) {
      throw new BadRequestException(
        `User with email ${withdrawal.email} not found.`,
      );
    }
    if (!user.walletId) {
      throw new BadRequestException(
        `User wallet ID is missing for ${withdrawal.email}.`,
      );
    }

    // 트랜잭션 기록 추가
    await this.transactionService.createTransaction({
      type: 'withdrawal',
      amount: withdrawal.amount,
      token: withdrawal.currency,
      transactionHash: 'N/A', // 실제 트랜잭션 해시를 제공해야 한다면 여기에 추가
      userId: withdrawal.email, // email을 userId로 사용 (실제 구현에 따라 변경 필요)
      walletId: user.walletId, // walletId를 WalletService로부터 가져와야 함
    });

    return true;
  }

  async rejectWithdrawal(
    withdrawalId: string,
    token: string,
  ): Promise<boolean> {
    const { id: userId } = this.jwtService.verify(token);
    const admin = await this.userService.findUserById(userId);

    // 어드민 계정 확인
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

  private async deductFromWallet(
    email: string,
    currency: string,
    amount: number,
  ): Promise<boolean> {
    try {
      const walletUpdateResult = await this.walletService.adjustBalance(
        email,
        currency,
        amount,
      );

      if (!walletUpdateResult) {
        throw new BadRequestException(
          `Failed to deduct ${amount} ${currency} from wallet.`,
        );
      }

      console.log(
        `Successfully deducted ${amount} ${currency} from ${email}'s wallet.`,
      );

      return true; // 성공적으로 차감되었음을 반환
    } catch (error) {
      const err = error as Error;
      console.error(`Error deducting balance from wallet: ${err.message}`);
      throw new BadRequestException(`Insufficient ${currency} balance.`);
    }
  }
}
