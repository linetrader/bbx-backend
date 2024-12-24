// src/wallet/wallet.service.ts

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Document } from 'mongoose';
import { ethers } from 'ethers';
import { Wallet } from './wallets.schema';
import { User } from '../users/users.schema';

@Injectable()
export class WalletsService {
  constructor(
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<Wallet & Document>,
    @InjectModel(User.name) private readonly userModel: Model<User & Document>,
  ) {}

  async createWallet(userId: string): Promise<string> {
    // Check if the user exists
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.walletId) {
      throw new Error('Wallet already exists for this user');
    }

    // Generate a new wallet using ethers.js
    const wallet = ethers.Wallet.createRandom();

    // Save the wallet in the wallets collection
    const newWallet = await this.walletModel.create({
      address: wallet.address,
      privateKey: wallet.privateKey,
      userId,
    });

    // Update the user's walletId
    user.walletId = String(newWallet._id); // 명시적으로 문자열로 변환
    await user.save();

    return wallet.address;
  }
}
