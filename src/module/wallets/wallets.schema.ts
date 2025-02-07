// src/wallets/wallets.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ObjectType, Field, ID } from '@nestjs/graphql';

@Schema({ timestamps: true })
@ObjectType()
export class Wallet extends Document {
  @Field(() => ID)
  id!: string;

  @Prop({ required: true })
  @Field()
  address!: string;

  @Prop({ required: true, type: String, default: '' })
  @Field()
  whithdrawAddress!: string;

  @Prop({ required: true })
  @Field()
  userId!: string;

  @Prop({ required: true, type: Number, default: 0.0 })
  @Field()
  bnbBalance!: number;

  @Prop({ required: true, type: Number, default: 0.0 })
  @Field()
  usdtBalance!: number;

  @Field(() => String)
  createdAt!: Date;

  @Field(() => String)
  updatedAt!: Date;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);

@ObjectType()
export class WalletsAdmin {
  @Field(() => ID)
  id!: string;

  @Field()
  username!: string;

  @Field()
  address!: string;

  @Field()
  whithdrawAddress!: string;

  @Field()
  bnbBalance!: number;

  @Field()
  usdtBalance!: number;

  @Field(() => String)
  createdAt!: Date;

  @Field(() => String)
  updatedAt!: Date;
}
