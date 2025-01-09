// src/users/users.service.ts

import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from './users.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly jwtService: JwtService,
  ) {}

  async findUserByEmail(email: string): Promise<User | null> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      return null;
    }

    return user;
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
    if (!user || !user.id) {
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
      referrer: referrer || null,
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

  // 페이징 처리된 사용자 목록 가져오기
  async getUsers(
    limit: number,
    offset: number,
    user: { id: string },
  ): Promise<User[]> {
    if (!user || !user.id) {
      throw new Error('Unauthorized: User information is missing.');
    }

    // 요청한 사용자의 정보를 데이터베이스에서 가져오기
    const userId = user.id;
    //console.log('userId - ', userId);
    const requestingUser = await this.userModel.findById(userId).exec();

    //console.log('requestingUser - ', requestingUser);
    if (!requestingUser) {
      throw new BadRequestException('Unauthorized: User not found.');
    }
    //console.log('requestingUser - ', requestingUser.userLevel);

    // 어드민 레벨 확인 (3, 2, 1)
    if (requestingUser.userLevel > 3) {
      throw new BadRequestException(
        'Unauthorized: Access is restricted to admins only.',
      );
    }

    return this.userModel
      .find()
      .sort({ createdAt: -1 }) // 최신순 정렬
      .skip(offset)
      .limit(limit)
      .exec();
  }

  // 총 사용자 수 반환
  async getTotalUsers(): Promise<number> {
    return this.userModel.countDocuments().exec(); // 사용자 수 카운트
  }
}
