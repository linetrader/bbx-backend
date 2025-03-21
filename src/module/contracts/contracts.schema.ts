// contracts.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Field, ObjectType, InputType, ID } from '@nestjs/graphql';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
@ObjectType()
export class Contract extends Document {
  @Field(() => ID)
  id!: string;

  @Prop({ type: [String], required: true })
  @Field(() => [String])
  content!: string[];

  @Prop({ required: true })
  @Field(() => String)
  date!: string;

  @Prop({ required: true })
  @Field(() => String)
  companyName!: string;

  @Prop({ required: true })
  @Field(() => String)
  companyAddress!: string;

  @Prop({ required: true })
  @Field(() => String)
  businessNumber!: string;

  @Prop({ required: true })
  @Field(() => String)
  representative!: string; // 대표명

  @Prop({ required: true })
  @Field(() => String)
  customerName!: string;

  @Prop({ required: true })
  @Field(() => String)
  customerPhone!: string;

  @Prop({ required: true })
  @Field(() => String)
  customerAddress!: string;

  @Prop({ required: true })
  @Field(() => String)
  userId!: string;

  @Prop({ required: true })
  @Field(() => String)
  packageName!: string;

  @Prop({ required: true, type: Number })
  @Field(() => Number)
  quantity!: number;

  @Prop({ required: true, type: Number })
  @Field(() => Number)
  totalPrice!: number;

  @Prop({ required: true })
  @Field(() => String)
  status!: string; // pending, approved, rejected

  @Field(() => String)
  createdAt!: Date;

  @Field(() => String)
  updatedAt!: Date;
}

export const ContractSchema = SchemaFactory.createForClass(Contract);

@ObjectType()
export class DefaultContractTemplate {
  @Field(() => [String])
  content!: string[];

  @Field(() => String)
  date!: string;

  @Field(() => String)
  companyName!: string;

  @Field(() => String)
  companyAddress!: string;

  @Field(() => String)
  businessNumber!: string;

  @Field(() => String)
  representative!: string;
}

@InputType()
export class CreateContractInput {
  @Field(() => String)
  customerName!: string;

  @Field(() => String)
  customerPhone!: string;

  @Field(() => String)
  customerAddress!: string;

  @Field(() => String)
  userId!: string;

  @Field(() => String)
  packageName!: string;

  @Field(() => Number)
  quantity!: number;

  @Field(() => Number)
  totalPrice!: number;

  @Field(() => String)
  status!: string;
}
