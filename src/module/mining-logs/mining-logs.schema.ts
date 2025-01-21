import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@ObjectType()
@Schema({ timestamps: true })
export class MiningLog extends Document {
  @Field(() => ID)
  id!: string;

  @Field()
  @Prop({ required: true })
  userId!: string;

  @Field()
  @Prop({ required: true })
  packageType!: string;

  @Field(() => Number)
  @Prop({ required: true, type: Number })
  profit!: number;

  @Field(() => Date)
  @Prop({ required: true })
  startTime!: Date; // 기록 시작 시간

  @Field(() => Date)
  @Prop({ required: true })
  endTime!: Date; // 기록 종료 시간

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

export const MiningLogSchema = SchemaFactory.createForClass(MiningLog);

@ObjectType()
export class MiningLogGroupedByDay {
  @Field()
  packageType!: string;

  @Field(() => Date)
  date!: Date;

  @Field(() => Number)
  profit!: number;
}
