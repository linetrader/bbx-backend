// src/module/package/package-users.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectType, Field } from '@nestjs/graphql';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
@ObjectType()
export class PackageUsers extends Document {
  @Prop({ required: true })
  @Field()
  userId!: string;

  @Prop({ required: true })
  @Field()
  packageType!: string; // btc, doge

  @Prop({ required: true, type: Number })
  @Field()
  quantity!: number;

  @Field(() => String)
  createdAt!: Date;
}

export const PackageUsersSchema = SchemaFactory.createForClass(PackageUsers);
