// src/withdraw-list/withdraw-list.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectType, Field } from '@nestjs/graphql';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
@ObjectType()
export class WithdrawList extends Document {
  @Prop({ required: true })
  @Field()
  email!: string;

  @Prop({ required: true, enum: ['USDT', 'DOGE', 'BTC'] })
  @Field()
  currency!: string;

  @Prop({ required: true })
  @Field()
  amount!: number;

  @Prop({ default: 'pending', enum: ['pending', 'approved', 'rejected'] })
  @Field()
  status!: string;

  @Field(() => String)
  createdAt!: Date;

  @Field(() => String)
  updatedAt!: Date;
}

export const WithdrawListSchema = SchemaFactory.createForClass(WithdrawList);
