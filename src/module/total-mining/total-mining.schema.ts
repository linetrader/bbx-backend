// module/total-mining/total-mining.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
@ObjectType()
export class TotalMining extends Document {
  @Field(() => ID)
  id!: string;

  @Prop({ required: true })
  @Field()
  miningType!: string;

  @Prop({ required: true })
  @Field()
  miningQuantity!: number;

  @Prop({ required: true })
  @Field()
  miningProfit!: number; // 상품 1개당 나오는 코인 수량

  @Field(() => String)
  createdAt!: Date;

  @Field(() => String)
  updatedAt!: Date;
}

export const TotalMiningSchema = SchemaFactory.createForClass(TotalMining);