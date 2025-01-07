// src/monitoring/monitoring.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ObjectType, Field, ID } from '@nestjs/graphql';

@Schema({ timestamps: true })
@ObjectType()
export class Monitoring extends Document {
  @Field(() => ID)
  id!: string;

  @Prop({ required: true })
  @Field()
  type!: string; // "deposit" or "mining" or "masterWithdaw"

  @Prop({ required: true, type: Boolean, default: false })
  @Field()
  isRunning!: boolean;

  @Prop({ required: true, type: Number, default: 120 })
  @Field()
  interval!: number; // 초

  @Field(() => String)
  createdAt!: Date;

  @Field(() => String)
  updatedAt!: Date;
}

export const MonitoringSchema = SchemaFactory.createForClass(Monitoring);
