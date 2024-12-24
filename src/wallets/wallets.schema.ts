// src/wallet/wallet.schema.ts

import { ObjectType, Field } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
@ObjectType()
export class Wallet extends Document {
  @Prop({ required: true })
  @Field()
  address!: string;

  @Prop({ required: true })
  @Field()
  privateKey!: string;

  @Prop({ required: true }) // userId로 관계 설정
  @Field()
  userId!: string;
}

// WalletSchema 생성 및 export
export const WalletSchema = SchemaFactory.createForClass(Wallet);
