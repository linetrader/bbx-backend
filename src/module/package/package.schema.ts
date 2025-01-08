// src/package/package.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
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

  @Prop({ required: true, type: Number, default: 3600000 }) // 기본값 1시간 (밀리초 단위)
  @Field()
  logInterval!: number; // 로그 저장 간격 (밀리초 단위)

  @Prop({ required: true, default: 'hide' })
  @Field()
  status!: string; // "show" or "hide"

  @Field(() => String)
  createdAt!: Date;

  @Field(() => String)
  updatedAt!: Date;
}

export const PackageSchema = SchemaFactory.createForClass(Package);
