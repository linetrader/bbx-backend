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
  @Field(() => [User]) // 사용자 배열
  data: User[];

  @Field(() => Int) // 총 사용자 수
  totalUsers: number;

  constructor(data: User[], totalUsers: number) {
    this.data = data;
    this.totalUsers = totalUsers;
  }
}
