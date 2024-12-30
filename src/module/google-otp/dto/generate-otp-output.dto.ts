// src/google-otp/dto/generate-otp-output.dto.ts
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class GenerateOtpOutput {
  @Field()
  qrCode!: string;

  @Field()
  manualKey!: string;
}
