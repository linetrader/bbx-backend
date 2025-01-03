// google-otp.resolver.ts

import { Query, Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { GoogleOTPService } from './google-otp.service';
import { GoogleOTP } from './google-otp.schema';
import { UnauthorizedException } from '@nestjs/common';
import { GenerateOtpOutput } from './dto/generate-otp-output.dto';

@Resolver(() => GoogleOTP)
export class GoogleOTPResolver {
  constructor(private readonly googleOTPService: GoogleOTPService) {}

  @Query(() => GoogleOTP)
  async getOtpInfo(@Context() context: any): Promise<GoogleOTP> {
    const user = context.req.user; // 인증된 사용자 정보

    if (!user || !user.email) {
      throw new UnauthorizedException('User not authenticated');
    }

    const otpInfo = await this.googleOTPService.getOtpInfo(user);
    if (!otpInfo) {
      throw new UnauthorizedException('OTP information not found');
    }

    return otpInfo;
  }

  @Mutation(() => GenerateOtpOutput)
  async generateOTP(@Context() context: any): Promise<GenerateOtpOutput> {
    const user = context.req.user; // 인증된 사용자 정보

    if (!user || !user.email) {
      throw new UnauthorizedException('User not authenticated');
    }

    const { qrCode, manualKey } = await this.googleOTPService.generateOTP(user);
    return { qrCode, manualKey };
  }

  @Mutation(() => Boolean)
  async verifyAndSaveOTP(
    @Context() context: any,
    @Args('otp') otpToken: string,
  ): Promise<boolean> {
    const user = context.req.user; // 인증된 사용자 정보

    if (!user || !user.email) {
      throw new UnauthorizedException('User not authenticated');
    }

    const isVerified = await this.googleOTPService.verifyAndSaveOTP(
      user,
      otpToken,
    );
    return isVerified;
  }

  @Mutation(() => Boolean)
  async verifyOnlyOTP(
    @Context() context: any,
    @Args('otp') otp: string,
  ): Promise<boolean> {
    const user = context.req.user; // 인증된 사용자 정보

    if (!user || !user.email) {
      throw new UnauthorizedException('User not authenticated');
    }

    return await this.googleOTPService.verifyOnly(user, otp);
  }
}
