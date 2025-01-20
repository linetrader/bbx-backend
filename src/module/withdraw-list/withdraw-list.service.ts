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
import { PackageUsersService } from '../package-users/package-users.service';
import { GetPendingWithdrawalsResponse } from './dto/get-pending-withdrawals-response.dto';
import { checkAdminAccess, checkUserAuthentication } from '../../utils/utils';

@Injectable()
export class WithdrawListService {
  constructor(
    @InjectModel(WithdrawList.name)
    private readonly withdrawListModel: Model<WithdrawList>,

    private readonly googleOtpService: GoogleOTPService,
    private readonly usersService: UsersService,
    private readonly packageUsersService: PackageUsersService,
  ) {}

  async getPendingWithdrawalsAdmin(
    limit: number,
    offset: number,
    user: { id: string },
  ): Promise<GetPendingWithdrawalsResponse[]> {
    await checkAdminAccess(this.usersService, user.id);

    const withdrawals = await this.withdrawListModel
      .find({ status: 'pending' })
      .sort({ createdAt: 1 })
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
          userId: withdrawal.userId,
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

  async getPendingWithdrawals(email: string): Promise<WithdrawList[]> {
    checkUserAuthentication({ id: email });

    const pendingWithdrawals = await this.withdrawListModel
      .find({ email, status: 'pending' })
      .exec();

    if (!pendingWithdrawals) {
      throw new BadRequestException('No pending withdrawals found.');
    }

    return pendingWithdrawals;
  }

  async processWithdrawalRequest(
    userId: string,
    email: string,
    currency: string,
    amount: number,
    otp: string,
  ): Promise<boolean> {
    checkUserAuthentication({ id: email });

    const isValidOtp = await this.googleOtpService.verifyOnly({ email }, otp);
    if (!isValidOtp) {
      throw new UnauthorizedException('Invalid OTP.');
    }

    const walletUpdateResult = await this.deductFromWallet(
      userId,
      currency,
      amount,
    );
    if (!walletUpdateResult) {
      throw new BadRequestException('Failed to deduct balance from wallet.');
    }

    const withdrawal = new this.withdrawListModel({
      userId,
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
    email: string,
  ): Promise<boolean> {
    await checkAdminAccess(this.usersService, email);

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

  async rejectWithdrawal(
    withdrawalId: string,
    email: string,
  ): Promise<boolean> {
    await checkAdminAccess(this.usersService, email);

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
