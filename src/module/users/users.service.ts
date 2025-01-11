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
    //console.log('Starting mining process for active packages...');
    //await this.initialMiningForAllPackages();
    //this.startMiningForPackage();
    //await this.initializeReferrerField();
  }

  async initializeReferrerField(): Promise<void> {
    try {
      // referrer가 존재하지 않거나 null인 사용자 검색
      const usersWithoutReferrer = await this.userModel
        .find({ $or: [{ referrer: { $exists: false } }, { referrer: null }] })
        .exec();

      if (usersWithoutReferrer.length === 0) {
        console.log('No users found without a referrer or with null referrer.');
        return;
      }

      for (const user of usersWithoutReferrer) {
        if (user.username !== 'linetrader') {
          user.referrer = 'linetrader';
          await user.save();
          console.log(`User ${user.id} referrer set to 'linetrader'`);
        }
      }

      console.log('Referrer field initialization complete.');
    } catch (error) {
      console.error('[ERROR] Failed to initialize referrer field:', error);
      throw new BadRequestException('Failed to initialize referrer field');
    }
  }

  async isValidAdmin(userId: string): Promise<boolean> {
    //console.log('isValidAdmin - ', userId);
    const user = await this.userModel.findById(userId).exec();
    //console.log('isValidAdmin - ', user?.userLevel);
    if (user && user.userLevel < 4) {
      return true;
    }
    return false;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      return null;
    }

    return user;
  }

  async findUserIdByUsername(username: string): Promise<string> {
    const user = await this.userModel.findOne({ username }).exec();
    if (!user) {
      return '';
    }

    return user.id;
  }

  async findUserById(userId: string): Promise<User | null> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      return null;
    }

    return user;
  }

  async getUserName(userId: string): Promise<string | null> {
    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('Invalid user ID');
    }

    try {
      const user = await this.userModel.findById(userId).exec(); // userId는 문자열이어야 합니다
      return user?.username || null;
    } catch (error) {
      console.error('[getUserName] Error fetching user:', error);
      throw new BadRequestException('Failed to fetch user');
    }
  }

  async getUserNameByEmail(email: string): Promise<string | null> {
    if (!email || typeof email !== 'string') {
      throw new BadRequestException('Invalid email');
    }
    try {
      const user = await this.userModel.findOne({ email }).exec();
      return user?.username || null;
    } catch (error) {
      console.error('[getUserName] Error fetching user:', error);
      throw new BadRequestException('Failed to fetch user');
    }
  }

  async getUserInfo(user: { id: string }): Promise<User | null> {
    console.log('getUserInfo - ', user.id);
    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated.');
    }

    const userInfo = await this.findUserById(user.id);
    //console.log('getUserInfo - ', userInfo);
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

    const token = this.jwtService.sign({ id: user._id, email: user.email });
    return token;
  }

  // MLM 네트워크를 구성하는 모든 하위 회원을 조회
  async getUsersUnderMyNetwork(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<{ users: User[]; totalUsers: number }> {
    try {
      //console.log('getUsersUnderMyNetwork - ', userId);
      const username = await this.getUserName(userId);
      if (!username) {
        throw new BadRequestException('Invalid referrer username.');
      }

      //console.log('getUsersUnderMyNetwork - ', username);

      // 하위 회원 username 가져오기
      const allDescendants = await this.fetchAllDescendants(
        this.userModel,
        username,
        'username',
      );

      //console.log('getUsersUnderMyNetwork - ', allDescendants);

      // 하위 회원 username 기준으로 회원 정보 조회
      const users = await this.userModel
        .find({ username: { $in: allDescendants } })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec();

      //console.log('getUsersUnderMyNetwork - ', users);

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

      // 하위 회원 userId 가져오기
      const allDescendantIds = await this.fetchAllDescendants(
        this.userModel,
        username,
        'id',
      );

      return allDescendantIds;
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
    // 직접 하위 회원 조회
    const directDescendants = await userModel
      .find({ referrer: referrerUsername })
      .exec();

    // 하위 회원의 지정된 필드 값 추출
    const results = directDescendants.map((user) => user[resultField]);

    // 하위 회원이 없으면 빈 배열 반환
    if (results.length === 0) {
      return [];
    }

    // 재귀적으로 하위 회원 탐색
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
      // 사용자 검색
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        throw new BadRequestException('User not found');
      }

      //console.log(userId);
      //console.log(updates);

      // 업데이트 가능한 필드 정의
      const fieldsToUpdate: Array<keyof User> = [
        'username',
        'firstname',
        'lastname',
        'email',
        'status',
        'referrer',
        'userLevel',
      ];

      // 필드 업데이트 로직
      for (const field of fieldsToUpdate) {
        const value = updates[field];
        if (value !== undefined && value !== null && String(value).trim()) {
          (user[field] as any) = value; // 타입 강제 캐스팅
        }
      }

      await user.save();
      return `User ${userId} updated successfully`;
    } catch (error) {
      console.error('[ERROR] Failed to update user details:', error);
      throw new BadRequestException('Failed to update user details');
    }
  }
}
