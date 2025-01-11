// src/package/coin-price.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
@ObjectType()
export class CoinPrice extends Document {
  @Field(() => ID)
  id!: string;

  @Prop({ required: true })
  @Field()
  language!: string; // en, ja, ko, zh

  @Prop({ required: true })
  @Field()
  coinName!: string; // BTC or DOGE

  @Prop({ required: true, type: Number })
  @Field()
  price!: number;

  @Field(() => String)
  createdAt!: Date;

  @Field(() => String)
  updatedAt!: Date;
}

export const CoinPriceSchema = SchemaFactory.createForClass(CoinPrice);
