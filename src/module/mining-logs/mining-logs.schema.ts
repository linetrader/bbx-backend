import { Field, ID } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class MiningLog extends Document {
  @Field(() => ID)
  id!: string;

  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  packageType!: string;

  @Prop({ required: true, type: Number })
  profit!: number;

  @Prop({ required: true })
  startTime!: Date; // 기록 시작 시간

  @Prop({ required: true })
  endTime!: Date; // 기록 종료 시간
}

export const MiningLogSchema = SchemaFactory.createForClass(MiningLog);
