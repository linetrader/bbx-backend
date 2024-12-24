// src/users/dto/login-response.dto.ts

import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class LoginResponse {
  @Field()
  token!: string;

  @Field()
  userId!: string;
}
