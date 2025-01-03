// google-otp.service.ts

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { GoogleOTP } from './google-otp.schema';
import * as crypto from 'crypto';

@Injectable()
export class GoogleOTPService {
  constructor(
    @InjectModel(GoogleOTP.name)
    private readonly googleOTPModel: Model<GoogleOTP>,
    private readonly jwtService: JwtService,
  ) {}

  async getOtpInfo(user: { email: string }): Promise<GoogleOTP | null> {
    if (!user || !user.email) {
      throw new UnauthorizedException('User email is missing.');
    }

    let otpInfo = await this.googleOTPModel
      .findOne({ email: user.email })
      .exec();

    // 데이터가 없을 경우 기본 데이터 생성
    if (!otpInfo) {
      otpInfo = new this.googleOTPModel({
        email: user.email,
        isOtpEnabled: false,
      });
      await otpInfo.save();
    }

    return otpInfo;
  }

  private getSecretKey(): Buffer {
    const secretKey = process.env.OTP_SECRET_KEY;
    if (!secretKey) {
      throw new BadRequestException(
        'Environment variable OTP_SECRET_KEY is not set.',
      );
    }
    if (secretKey.length !== 64) {
      // 32바이트 16진수 문자열 = 64문자
      throw new BadRequestException(
        'OTP_SECRET_KEY must be a 32-byte hex string.',
      );
    }
    return Buffer.from(secretKey, 'hex');
  }

  private formatEncryptedData(iv: Buffer, encrypted: string): string {
    return JSON.stringify({ iv: iv.toString('hex'), data: encrypted });
  }

  private parseEncryptedData(text: string): { iv: Buffer; data: string } {
    const parsed = JSON.parse(text);
    return {
      iv: Buffer.from(parsed.iv, 'hex'),
      data: parsed.data,
    };
  }

  encrypt(text: string): string {
    const key = this.getSecretKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return this.formatEncryptedData(iv, encrypted);
  }

  decrypt(text: string): string {
    try {
      const key = this.getSecretKey();
      const { iv, data } = this.parseEncryptedData(text);

      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

      let decrypted = decipher.update(data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch {
      throw new UnauthorizedException('Failed to decrypt OTP secret.');
    }
  }

  async generateOTP(user: {
    email: string;
  }): Promise<{ qrCode: string; manualKey: string }> {
    if (!user || !user.email) {
      throw new UnauthorizedException('User email is missing.');
    }

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, 'BitBoosterX', secret);
    const qrCode = await QRCode.toDataURL(otpauth);

    try {
      let otpRecord = await this.googleOTPModel.findOne({ email: user.email });

      if (!otpRecord) {
        otpRecord = new this.googleOTPModel({
          email: user.email,
          otpSecret: this.encrypt(secret),
          isOtpEnabled: false,
        });
      } else {
        otpRecord.otpSecret = this.encrypt(secret);
        otpRecord.isOtpEnabled = false; // OTP 활성화는 verify 이후에 설정됨
      }

      await otpRecord.save();

      return { qrCode, manualKey: secret };
    } catch (error) {
      console.error('Error saving OTP data:', error);
      throw new BadRequestException('Failed to save OTP data.');
    }
  }

  async verifyAndSaveOTP(
    user: { email: string },
    otpToken: string,
  ): Promise<boolean> {
    if (!user || !user.email) {
      throw new UnauthorizedException('User email is missing.');
    }

    try {
      const otpRecord = await this.googleOTPModel.findOne({
        email: user.email,
      });
      if (!otpRecord) {
        throw new UnauthorizedException('OTP record not found for the email.');
      }

      if (!otpRecord.otpSecret) {
        throw new UnauthorizedException('No OTP secret found for this user.');
      }

      const decryptedSecret = this.decrypt(otpRecord.otpSecret);
      const isValid = authenticator.check(otpToken, decryptedSecret);
      if (!isValid) {
        throw new UnauthorizedException('Invalid OTP entered.');
      }

      otpRecord.isOtpEnabled = true;
      otpRecord.otpSecret = this.encrypt(decryptedSecret);
      await otpRecord.save();

      return true;
    } catch (error) {
      console.error('Error during OTP verification:', error);
      throw error;
    }
  }

  async verifyOnly(
    user: { email: string },
    otpToken: string,
  ): Promise<boolean> {
    if (!user || !user.email) {
      throw new UnauthorizedException('User email is missing.');
    }

    try {
      const otpRecord = await this.googleOTPModel.findOne({
        email: user.email,
      });
      if (!otpRecord) {
        console.error(`No OTP record found for email: ${user.email}`);
        throw new UnauthorizedException('OTP record not found for the email.');
      }

      if (!otpRecord.otpSecret) {
        console.error(`No OTP secret found for email: ${user.email}`);
        throw new UnauthorizedException('No OTP secret found for this user.');
      }

      const decryptedSecret = this.decrypt(otpRecord.otpSecret);
      const isValid = authenticator.check(otpToken, decryptedSecret);

      if (!isValid) {
        throw new UnauthorizedException('Invalid OTP entered.');
      }

      return isValid;
    } catch {
      throw new UnauthorizedException('Failed to verify OTP.');
    }
  }
}
