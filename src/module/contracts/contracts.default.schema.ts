// contracts.default.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Field, ObjectType } from '@nestjs/graphql';

@Schema()
@ObjectType()
export class DefaultContract extends Document {
  @Prop({ type: [String], required: true }) // MongoDB에서 배열로 저장
  @Field(() => [String]) // GraphQL에서 content를 배열로 명시
  content!: string[];

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
  representative!: string;
}

export const DefaultContractSchema =
  SchemaFactory.createForClass(DefaultContract);
