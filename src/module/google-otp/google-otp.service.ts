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

  async getOtpInfo(authHeader: string): Promise<GoogleOTP | null> {
    if (!authHeader) {
      throw new UnauthorizedException('No Authorization header found.');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Bearer token is missing.');
    }

    try {
      const decoded = this.jwtService.verify(token); // JWT 토큰 검증
      const userEmail = decoded.email;
      if (!userEmail) {
        throw new UnauthorizedException('OTP Email is missing in token.');
      }

      let otpInfo = await this.googleOTPModel
        .findOne({ email: userEmail })
        .exec();

      // 데이터가 없을 경우 기본 데이터 생성
      if (!otpInfo) {
        otpInfo = new this.googleOTPModel({
          email: userEmail,
          isOtpEnabled: false,
        });
        await otpInfo.save();
      }

      return otpInfo;
    } catch (err) {
      console.error('Error verifying token:', err);
      throw new UnauthorizedException('Invalid or expired token.');
    }
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

      //console.log(`Decrypted data: ${decrypted}`);
      return decrypted;
    } catch {
      throw new UnauthorizedException('Failed to decrypt OTP secret.');
    }
  }

  async generateOTP(
    authHeader: string,
  ): Promise<{ qrCode: string; manualKey: string }> {
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing.');
    }

    const token = authHeader.split(' ')[1];
    const { email } = this.jwtService.verify(token);

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(email, 'BitBoosterX', secret);
    const qrCode = await QRCode.toDataURL(otpauth);

    try {
      // 기존 데이터 찾기
      let otpRecord = await this.googleOTPModel.findOne({ email });

      if (!otpRecord) {
        // 새 데이터 생성
        otpRecord = new this.googleOTPModel({
          email,
          otpSecret: this.encrypt(secret),
          isOtpEnabled: false,
        });
      } else {
        // 기존 데이터 업데이트
        otpRecord.otpSecret = this.encrypt(secret);
        otpRecord.isOtpEnabled = false; // OTP 활성화는 verify 이후에 설정됨
      }

      // 데이터 저장
      await otpRecord.save();

      return { qrCode, manualKey: secret };
    } catch (error) {
      console.error('Error saving OTP data:', error);
      throw new BadRequestException('Failed to save OTP data.');
    }
  }

  async verifyAndSaveOTP(
    authHeader: string,
    otpToken: string,
  ): Promise<boolean> {
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing.');
    }

    const token = authHeader.split(' ')[1];
    const { email } = this.jwtService.verify(token);

    try {
      const otpRecord = await this.googleOTPModel.findOne({ email });
      if (!otpRecord) {
        throw new UnauthorizedException('OTP record not found for the email.');
      }

      if (!otpRecord.otpSecret) {
        throw new UnauthorizedException('No OTP secret found for this user.');
      }

      const decryptedSecret = this.decrypt(otpRecord.otpSecret);
      //console.log('Decrypted Secret for Validation:', decryptedSecret);

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

  async verifyOnly(authHeader: string, otpToken: string): Promise<boolean> {
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing.');
    }

    const token = authHeader.split(' ')[1];
    const { email } = this.jwtService.verify(token);

    try {
      const otpRecord = await this.googleOTPModel.findOne({ email });
      if (!otpRecord) {
        console.error(`No OTP record found for email: ${email}`);
        throw new UnauthorizedException('OTP record not found for the email.');
      }

      if (!otpRecord.otpSecret) {
        console.error(`No OTP secret found for email: ${email}`);
        throw new UnauthorizedException('No OTP secret found for this user.');
      }

      const decryptedSecret = this.decrypt(otpRecord.otpSecret);
      //console.log(`Decrypted Secret for ${email}: ${decryptedSecret}`);

      const isValid = authenticator.check(otpToken, decryptedSecret);
      //console.log(`OTP validation result for ${email}: ${isValid}`);

      if (!isValid) {
        throw new UnauthorizedException('Invalid OTP entered.');
      }

      return isValid;
    } catch {
      throw new UnauthorizedException('Failed to verify OTP.');
    }
  }
}
