// src/users/dto/login-response.dto.ts

import { ObjectType, Field, Int } from '@nestjs/graphql';
import { User } from '../users.schema';

@ObjectType()
export class LoginResponse {
  @Field()
  token!: string;
}

@ObjectType()
export class GetUsersResponse {
  @Field(() => [User])
  data: User[];

  @Field(() => Int)
  totalUsers: number;

  constructor(data: User[], totalUsers: number) {
    this.data = data;
    this.totalUsers = totalUsers;
  }
}
