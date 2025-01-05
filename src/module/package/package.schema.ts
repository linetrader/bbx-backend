// src/package/package.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Document } from 'mongoose';

@Schema()
@ObjectType()
export class Package extends Document {
  @Field(() => ID)
  id!: string;

  @Prop({ required: true })
  @Field()
  name!: string;

  @Prop({ required: true, type: Number })
  @Field()
  price!: number;

  @Prop({ required: true })
  @Field()
  miningProfit!: number; // 상품 1개당 나오는 코인 수량

  @Prop({ required: true, default: 'hide' })
  @Field()
  status!: string; // "show" or "hide"
}

export const PackageSchema = SchemaFactory.createForClass(Package);
