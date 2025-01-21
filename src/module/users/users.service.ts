// src/users/users.service.ts

import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from './users.schema';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    // 초기화 로직이 주석 처리되어 있음
  }

  async findMyReferrerById(userId: string): Promise<string | null> {
    const user = await this.userModel.findById(userId).exec();
    return user?.referrer || null;
  }

  async findMyReferrer(username: string): Promise<string> {
    const user = await this.userModel.findOne({ username }).exec();
    return user?.referrer || '';
  }

  async isValidSuperUser(userId: string): Promise<boolean> {
    const user = await this.userModel.findById(userId).exec();
    return user?.userLevel === 1 || false;
  }

  async isValidAdmin(userId: string): Promise<boolean> {
    const user = await this.userModel.findById(userId).exec();
    //console.log('isValidAdmin user:', user);
    return user ? user.userLevel < 4 : false;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findUserIdByUsername(username: string): Promise<string> {
    const user = await this.userModel.findOne({ username }).exec();
    return user?.id || '';
  }

  async findUserById(userId: string): Promise<User | null> {
    return this.userModel.findById(userId).exec();
  }

  async getUserName(userId: string): Promise<string> {
    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      console.error('User not found for ID:', userId); // 추가된 로그
      throw new BadRequestException('Not user');
    }
    return user.username;
  }

  async getUserNameByEmail(email: string): Promise<string | null> {
    if (!email || typeof email !== 'string') {
      throw new BadRequestException('Invalid email');
    }
    const user = await this.userModel.findOne({ email }).exec();
    return user?.username || null;
  }

  async getUserInfo(user: { id: string }): Promise<User | null> {
    if (!user?.id) {
      throw new UnauthorizedException('User not authenticated.');
    }

    const userInfo = await this.findUserById(user.id);
    if (!userInfo) {
      throw new BadRequestException('User not found.');
    }

    return userInfo;
  }

  async register(userData: Partial<User>): Promise<string> {
    const { email, username, password, referrer } = userData;

    if (!password) {
      throw new BadRequestException('Password is required');
    }

    const existingUser = await this.userModel.findOne({
      $or: [{ email }, { username }],
    });
    if (existingUser) {
      if (existingUser.email === email) {
        throw new BadRequestException('Email already exists');
      }
      if (existingUser.username === username) {
        throw new BadRequestException('Username already exists');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new this.userModel({
      ...userData,
      password: hashedPassword,
      referrer: referrer || 'linetrader',
    });
    await newUser.save();

    return 'User registered successfully!';
  }

  async login(email: string, password: string): Promise<string> {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new BadRequestException('Email not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Incorrect password');
    }

    return this.jwtService.sign({ id: user._id, email: user.email });
  }

  async getUsersUnderMyNetwork(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<{ users: User[]; totalUsers: number }> {
    try {
      const username = await this.getUserName(userId);
      if (!username) {
        throw new BadRequestException('Invalid referrer username.');
      }

      const allDescendants = await this.fetchAllDescendants(
        this.userModel,
        username,
        'username',
      );

      const users = await this.userModel
        .find({ username: { $in: allDescendants } })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec();

      const totalUsers = await this.userModel
        .countDocuments({ username: { $in: allDescendants } })
        .exec();

      return { users, totalUsers };
    } catch (error) {
      console.error('[ERROR] Failed to fetch network users:', error);
      throw new BadRequestException('Failed to fetch network users.');
    }
  }

  async getUserIdsUnderMyNetwork(userId: string): Promise<string[]> {
    try {
      const username = await this.getUserName(userId);
      if (!username) {
        throw new BadRequestException('Invalid referrer username.');
      }

      return this.fetchAllDescendants(this.userModel, username, 'id');
    } catch (error) {
      console.error('[ERROR] Failed to fetch descendant user IDs:', error);
      throw new BadRequestException('Failed to fetch descendant user IDs.');
    }
  }

  async fetchAllDescendants(
    userModel: Model<User>,
    referrerUsername: string,
    resultField: 'id' | 'username',
  ): Promise<string[]> {
    const directDescendants = await userModel
      .find({ referrer: referrerUsername })
      .exec();

    const results = directDescendants.map((user) => user[resultField]);

    if (results.length === 0) {
      return [];
    }

    const nestedResults = await Promise.all(
      directDescendants.map((descendant) =>
        this.fetchAllDescendants(userModel, descendant.username, resultField),
      ),
    );

    return [...results, ...nestedResults.flat()];
  }

  async updateUserDetails(
    userId: string,
    updates: Partial<User>,
  ): Promise<string> {
    try {
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        throw new BadRequestException('User not found');
      }

      const fieldsToUpdate: Array<keyof User> = [
        'username',
        'firstname',
        'lastname',
        'email',
        'status',
        'referrer',
        'userLevel',
      ];

      for (const field of fieldsToUpdate) {
        const value = updates[field];
        if (value !== undefined && value !== null && String(value).trim()) {
          (user[field] as any) = value;
        }
      }

      await user.save();
      return `User ${userId} updated successfully`;
    } catch (error) {
      console.error('[ERROR] Failed to update user details:', error);
      throw new BadRequestException('Failed to update user details');
    }
  }

  async getAllUserIds(): Promise<string[]> {
    const users = await this.userModel.find({}, '_id').exec();
    return users.map((user) => user.id.toString());
  }
}
