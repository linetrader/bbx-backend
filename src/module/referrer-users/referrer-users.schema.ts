// src/module/referrer-users/referrer-users.schema.ts

import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
@ObjectType() // GraphQL 타입 정의
export class ReferrerUser extends Document {
  @Field(() => ID)
  id!: string;

  @Prop({ required: true })
  @Field()
  groupLeaderName!: string;

  @Prop({ required: true })
  @Field()
  userName!: string;

  @Prop({ required: true })
  @Field()
  packageType!: string;

  @Prop({ required: true, type: Number })
  @Field()
  feeRateLeader!: number;

  @Prop({ required: true, type: Number })
  @Field()
  feeRate!: number;

  @Field(() => String)
  createdAt!: Date;

  @Field(() => String)
  updatedAt!: Date;
}

export const ReferrerUserSchema = SchemaFactory.createForClass(ReferrerUser);
