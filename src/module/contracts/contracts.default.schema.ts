// contracts.default.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class DefaultContract extends Document {
  @Prop({ required: true })
  content!: string;

  @Prop({ required: true })
  companyName!: string;

  @Prop({ required: true })
  companyAddress!: string;

  @Prop({ required: true })
  businessNumber!: string;

  @Prop({ required: true })
  representative!: string;
}

export const DefaultContractSchema =
  SchemaFactory.createForClass(DefaultContract);
