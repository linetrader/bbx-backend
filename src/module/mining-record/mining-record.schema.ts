// src/module/mining/mining.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectType, Field } from '@nestjs/graphql';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
@ObjectType()
export class MiningRecord extends Document {
  @Prop({ required: true })
  @Field()
  userId!: string;

  @Prop({ required: true })
  @Field()
  packageType!: string; // btc, doge

  @Prop({ required: true })
  @Field()
  mined!: number;

  @Field(() => String)
  createdAt!: Date;
}

export const MiningRecordSchema = SchemaFactory.createForClass(MiningRecord);
