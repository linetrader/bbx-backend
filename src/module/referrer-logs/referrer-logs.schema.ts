// src/module/referrer-logs/referrer-logs.schema.ts

import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
@ObjectType() // GraphQL 타입 정의
export class ReferrerLog extends Document {
  @Field(() => ID)
  id!: string;

  @Prop({ required: true, index: true })
  @Field() // GraphQL 필드로 노출
  userName!: string;

  @Prop({ required: true, index: true })
  @Field() // GraphQL 필드로 노출
  referrerUserName!: string;

  @Prop({ required: true })
  @Field() // GraphQL 필드로 노출
  packageType!: string;

  @Prop({ required: true, type: Number })
  @Field() // GraphQL 필드로 노출
  profit!: number;

  @Field(() => String)
  createdAt!: Date;
}

export const ReferrerLogSchema = SchemaFactory.createForClass(ReferrerLog);
