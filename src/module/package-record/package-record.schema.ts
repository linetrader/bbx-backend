// src/package/package-record.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectType, Field } from '@nestjs/graphql';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
@ObjectType()
export class PackageRecord extends Document {
  @Prop({ required: true })
  @Field()
  packageName!: string;

  @Prop({ required: true, type: Number })
  @Field()
  quantity!: number;

  @Prop({ required: true, type: Number })
  @Field()
  totalPrice!: number;

  @Prop({ required: true })
  @Field()
  userId!: string;

  @Field(() => String)
  createdAt!: Date;
}

export const PackageRecordSchema = SchemaFactory.createForClass(PackageRecord);
