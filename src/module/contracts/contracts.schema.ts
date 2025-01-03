// contracts.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Field, ObjectType, InputType } from '@nestjs/graphql';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
@ObjectType()
export class Contract extends Document {
  @Prop({ required: true })
  @Field()
  content!: string;

  @Prop({ required: true })
  @Field()
  date!: string;

  @Prop({ required: true })
  @Field()
  companyName!: string;

  @Prop({ required: true })
  @Field()
  companyAddress!: string;

  @Prop({ required: true })
  @Field()
  businessNumber!: string;

  @Prop({ required: true })
  @Field()
  representative!: string;

  @Prop({ required: true })
  @Field()
  customerName!: string;

  @Prop({ required: true })
  @Field()
  customerPhone!: string;

  @Prop({ required: true })
  @Field()
  customerAddress!: string;

  @Prop({ required: true })
  @Field()
  userId!: string;

  @Prop({ required: true })
  @Field()
  packageName!: string;

  @Prop({ required: true, type: Number })
  @Field()
  quantity!: number;

  @Prop({ required: true, type: Number })
  @Field()
  totalPrice!: number;

  @Field(() => String)
  createdAt!: Date;
}

export const ContractSchema = SchemaFactory.createForClass(Contract);

@ObjectType()
export class DefaultContractTemplate {
  @Field()
  content!: string;

  @Field()
  date!: string;

  @Field()
  companyName!: string;

  @Field()
  companyAddress!: string;

  @Field()
  businessNumber!: string;

  @Field()
  representative!: string;
}

@InputType()
export class CreateContractInput {
  @Field()
  customerName!: string;

  @Field()
  customerPhone!: string;

  @Field()
  customerAddress!: string;

  @Field()
  userId!: string;

  @Field()
  packageName!: string;

  @Field(() => Number)
  quantity!: number;

  @Field(() => Number)
  totalPrice!: number;
}
