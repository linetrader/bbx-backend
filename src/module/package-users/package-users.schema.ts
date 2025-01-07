// src/module/package/package-users.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
@ObjectType()
export class PackageUsers extends Document {
  @Field(() => ID)
  id!: string;

  @Prop({ required: true })
  @Field()
  userId!: string;

  @Prop({ type: String, required: false }) // Wallet과의 관계를 나타내는 필드
  @Field({ nullable: true })
  walletId?: string;

  @Prop({ required: true })
  @Field()
  packageType!: string; // BTC, DOGE

  @Prop({ required: true, type: Number })
  @Field()
  quantity!: number;

  @Prop({ required: true })
  @Field()
  miningBalance!: number; // 마이닝 된 수량 (누적)

  @Field(() => String)
  createdAt!: Date;

  @Field(() => String)
  updatedAt!: Date;
}

export const PackageUsersSchema = SchemaFactory.createForClass(PackageUsers);
