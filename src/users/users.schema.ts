// src/users/users.schema.ts

import { Field, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
@ObjectType()
export class User extends Document {
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

  @Prop({ type: String, required: false })
  @Field({ nullable: true })
  referrer?: string;

  @Prop({ type: String, required: false }) // Wallet과의 관계를 나타내는 필드
  @Field({ nullable: true })
  walletId?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);