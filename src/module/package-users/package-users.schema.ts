// src/module/package/package-users.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
@ObjectType()
export class PackageUsers extends Document {
  @Field(() => ID)
  id!: string;

  @Prop({ required: true })
  @Field()
  userId!: string;

  @Prop({ required: true })
  @Field({ nullable: true })
  groupLeaderName!: string;

  @Prop({ required: true })
  @Field()
  referrerUserName!: string;

  @Prop({ type: String, required: false })
  @Field({ nullable: true })
  walletId?: string;

  @Prop({ required: true })
  @Field()
  packageType!: string;

  @Prop({ required: true, type: Number })
  @Field()
  quantity!: number;

  @Prop({ required: true })
  @Field()
  miningBalance!: number;

  @Field(() => String)
  createdAt!: Date;

  @Field(() => String)
  updatedAt!: Date;
}

export const PackageUsersSchema = SchemaFactory.createForClass(PackageUsers);
