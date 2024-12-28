// src/users/users.schema.ts

import { Field, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true }) // timestamps 옵션 활성화
@ObjectType()
export class User extends Document {
  @Prop({ required: true })
  @Field()
  username!: string;

  @Prop({ required: true })
  @Field()
  firstname!: string;

  @Prop({ required: true })
  @Field()
  lastname!: string;

  @Prop({ required: true })
  @Field()
  email!: string;

  @Prop({ required: true })
  @Field()
  password!: string;

  @Prop({ default: 'active' })
  @Field({ nullable: true })
  status?: string;

  @Prop({ default: false })
  @Field()
  email_verified!: boolean;

  @Prop({ type: String, required: false })
  @Field({ nullable: true })
  referrer?: string;

  @Prop({ type: String, required: false }) // Wallet과의 관계를 나타내는 필드
  @Field({ nullable: true })
  walletId?: string;

  @Prop({ type: Number, default: 7 }) // 기본값: 일반회원
  @Field({ description: 'User Level', defaultValue: 7 })
  userLevel!: number; // 슈퍼 어드민(1) ~ 일반회원(7)
}

export const UserSchema = SchemaFactory.createForClass(User);
