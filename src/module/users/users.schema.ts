// src/users/users.schema.ts

import { Field, ObjectType, ID } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
@ObjectType()
export class User extends Document {
  @Field(() => ID)
  id!: string;

  @Prop({ required: true })
  @Field()
  username!: string;

  @Prop({ required: true })
  @Field()
  firstname!: string;

  @Prop({ required: true })
  @Field()
  lastname!: string;

  @Prop({ required: true })
  @Field()
  email!: string;

  @Prop({ required: true })
  @Field()
  password!: string;

  @Prop({ default: 'active' })
  @Field({ nullable: true })
  status?: string;

  @Prop({ default: false })
  @Field()
  email_verified!: boolean;

  @Prop({ type: String, index: true })
  @Field({ nullable: true })
  referrer!: string;

  @Prop({ type: String, required: false })
  @Field({ nullable: true })
  walletId?: string;

  @Prop({ type: Number, default: 7 })
  @Field({ description: 'User Level', defaultValue: 7 })
  userLevel!: number;

  @Field(() => String)
  createdAt!: Date;

  @Field(() => String)
  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
