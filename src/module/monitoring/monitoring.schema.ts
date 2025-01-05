// src/monitoring/monitoring.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ObjectType, Field } from '@nestjs/graphql';

@Schema()
@ObjectType()
export class Monitoring extends Document {
  @Prop({ required: true })
  @Field()
  type!: string; // "deposit" or "mining" or "masterWithdaw"

  @Prop({ required: true, type: Boolean, default: false })
  @Field()
  isRunning!: boolean;

  @Prop({ required: true, type: Number, default: 120 })
  @Field()
  interval!: number; // 초
}

export const MonitoringSchema = SchemaFactory.createForClass(Monitoring);
