// src/module/package/package-users.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectType, Field } from '@nestjs/graphql';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
@ObjectType()
export class PackageUsers extends Document {
  @Prop({ required: true })
  @Field()
  userId!: string;

  @Prop({ type: String, required: false }) // Wallet과의 관계를 나타내는 필드
  @Field({ nullable: true })
  walletId?: string;

  @Prop({ required: true })
  @Field()
  packageType!: string; // btc, doge

  @Prop({ required: true, type: Number })
  @Field()
  quantity!: number;

  @Prop({ required: true })
  @Field()
  miningBalance!: number; // 마이닝 된 수량 (누적)

  @Field(() => String)
  createdAt!: Date;
}

export const PackageUsersSchema = SchemaFactory.createForClass(PackageUsers);
