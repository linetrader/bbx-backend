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
    const authHeader = context.req.headers.authorization;

    //console.log('UsersResolver - getUserInfo : ', authHeader);
    const otpInfo = await this.googleOTPService.getOtpInfo(authHeader);
    if (!otpInfo) {
      throw new UnauthorizedException('User not found');
    }

    return otpInfo;
  }

  @Mutation(() => GenerateOtpOutput)
  async generateOTP(@Context() context: any): Promise<GenerateOtpOutput> {
    const authHeader = context.req.headers.authorization;

    const { qrCode, manualKey } =
      await this.googleOTPService.generateOTP(authHeader);
    return { qrCode, manualKey };
  }

  @Mutation(() => Boolean)
  async verifyAndSaveOTP(
    @Context() context: any,
    @Args('otp') otpToken: string,
  ): Promise<boolean> {
    const authHeader = context.req.headers.authorization;

    const isVerified = await this.googleOTPService.verifyAndSaveOTP(
      authHeader,
      otpToken,
    );
    return isVerified;
  }

  @Mutation(() => Boolean)
  async verifyOnlyOTP(
    @Context() context: any,
    @Args('otp') otp: string,
  ): Promise<boolean> {
    const authHeader = context.req.headers.authorization;

    return await this.googleOTPService.verifyOnly(authHeader, otp);
  }
}
