import { Injectable, BadRequestException } from '@nestjs/common';
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

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  // 회원가입
  async register(userData: Partial<User>): Promise<string> {
    const { email, username, password, referrer } = userData;

    try {
      // 이메일 또는 사용자 이름 중복 확인
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

      if (!password) {
        throw new BadRequestException('Password is required');
      }

      // 비밀번호 암호화
      const hashedPassword = await bcrypt.hash(password, 10);

      // 새 사용자 생성
      const newUser = new this.userModel({
        ...userData,
        password: hashedPassword,
        referrer: referrer || null, // 추천인 필드 추가
      });
      await newUser.save();

      return 'User registered successfully!';
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new Error('An unknown error occurred during registration');
    }
  }

  // 로그인
  async login(email: string, password: string): Promise<{ token: string }> {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new BadRequestException('Email not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Incorrect password');
    }

    // JWT 토큰 생성
    const token = this.jwtService.sign({ id: user._id, email: user.email });
    return { token };
  }
}
