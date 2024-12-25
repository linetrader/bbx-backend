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

  async findById(userId: string): Promise<User | null> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      return null;
    }

    return user;
  }

  verifyToken(token: string): { id: string; email: string } {
    try {
      return this.jwtService.verify(token) as { id: string; email: string };
    } catch (err) {
      console.error('Token verification failed:', err); // 에러 로그
      throw new BadRequestException('Invalid or expired token.');
    }
  }

  async getUserInfo(authHeader: string): Promise<User | null> {
    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Bearer token is missing.');
    }

    try {
      const decoded = this.verifyToken(token); // JWT 토큰 검증
      console.log('Decoded Token:', decoded);

      const userId = decoded.id;
      if (!userId) {
        throw new UnauthorizedException('User ID is missing in token.');
      }

      const user = await this.findById(userId);
      if (!user) {
        throw new BadRequestException('User not found.');
      }

      return user;
    } catch (err) {
      console.error('Error verifying token:', err);
      throw new UnauthorizedException('Invalid or expired token.');
    }
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
    console.log('UsersService - Received email:', email);

    const user = await this.userModel.findOne({ email });
    if (!user) {
      console.warn('UsersService - Email not found');
      throw new BadRequestException('Email not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.warn('UsersService - Incorrect password for email:', email);
      throw new BadRequestException('Incorrect password');
    }

    const token = this.jwtService.sign({ id: user._id, email: user.email });
    console.log('UsersService - Generated JWT Token:', token);

    return token;
  }
}
