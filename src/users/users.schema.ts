import { Field, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
@ObjectType() // GraphQL에서 사용될 클래스임을 명시
export class User extends Document {
  @Prop({ required: true })
  @Field() // GraphQL 필드로 설정
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
  @Field({ nullable: true }) // GraphQL에서 선택 사항으로 설정
  referrer?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
