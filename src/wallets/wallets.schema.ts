// src/wallets/wallets.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ObjectType, Field, ID } from '@nestjs/graphql';

@Schema()
@ObjectType()
export class Wallet extends Document {
  @Field(() => ID)
  id!: string;

  @Prop({ required: true })
  @Field()
  address!: string;

  @Prop({ required: true })
  @Field()
  userId!: string;

  @Prop({ required: true, type: Number, default: 0.0 })
  @Field()
  usdtBalance!: number;

  @Prop({ required: true, type: Number, default: 0.0 })
  @Field()
  dogeBalance!: number;

  @Prop({ required: true, type: Number, default: 0.0 })
  @Field()
  btcBalance!: number;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
