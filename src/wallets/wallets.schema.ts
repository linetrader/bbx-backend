// src/wallet/wallet.schema.ts

import { ObjectType, Field } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true }) // timestamps 옵션 활성화
@ObjectType()
export class Wallet extends Document {
  @Prop({ required: true })
  @Field()
  address!: string;

  @Prop({ default: '0.0' }) // 기본값 설정
  @Field({ nullable: true }) // GraphQL에서 선택적으로 처리
  usdtBalance?: string;

  @Prop({ default: '0.0' }) // 기본값 설정
  @Field({ nullable: true }) // GraphQL에서 선택적으로 처리
  btcBalance?: string;

  @Prop({ required: true }) // userId로 관계 설정
  @Field()
  userId!: string;
}

// WalletSchema 생성 및 export
export const WalletSchema = SchemaFactory.createForClass(Wallet);
