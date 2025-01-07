// src/google-otp/google-otp.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
@ObjectType()
export class GoogleOTP extends Document {
  @Field(() => ID)
  id!: string;

  @Prop({ required: true })
  @Field()
  email!: string;

  @Prop({ type: String, required: false })
  @Field()
  otpSecret?: string;

  @Prop({ type: Boolean, default: false })
  @Field()
  isOtpEnabled?: boolean;

  @Field(() => String)
  createdAt!: Date;

  @Field(() => String)
  updatedAt!: Date;
}

export const GoogleOTPSchema = SchemaFactory.createForClass(GoogleOTP);
