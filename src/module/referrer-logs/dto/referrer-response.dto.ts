// src/module/referrer-logs/dto/referrer-response.dto.ts

import { ObjectType, Field, Int } from '@nestjs/graphql';
import { ReferrerLog } from '../referrer-logs.schema';

@ObjectType()
export class AdminReferralLogsResponse {
  @Field(() => [ReferrerLog])
  data: ReferrerLog[];

  @Field(() => Int)
  total: number;

  constructor(data: ReferrerLog[], total: number) {
    this.data = data;
    this.total = total;
  }
}
