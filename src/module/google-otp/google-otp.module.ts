// google-otp.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GoogleOTPService } from './google-otp.service';
import { GoogleOTPResolver } from './google-otp.resolver';
import { GoogleOTP, GoogleOTPSchema } from './google-otp.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GoogleOTP.name, schema: GoogleOTPSchema },
    ]),
  ],
  providers: [GoogleOTPService, GoogleOTPResolver],
  exports: [GoogleOTPService], // 외부에서 사용하기 위해 내보내기
})
export class GoogleOTPModule {}
