// src/transaction/transaction.schema.ts

import { ObjectType, Field } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
@ObjectType()
export class Transaction extends Document {
  @Prop({ required: true })
  @Field()
  type!: string; // "deposit" or "withdrawal"

  @Prop({ required: true })
  @Field()
  amount!: string;

  @Prop({ required: true })
  @Field()
  token!: string; // e.g., "USDT", "BTC", "DOGE"

  @Prop({ required: true })
  @Field()
  transactionHash!: string;

  @Prop({ required: true }) // userId로 관계 설정
  @Field()
  userId!: string;

  @Prop({ required: true })
  @Field()
  walletId!: string;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
