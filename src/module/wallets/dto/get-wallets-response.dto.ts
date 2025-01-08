// src/resolvers/dto/get-wallets-response.dto.ts

import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Wallet } from '../wallets.schema';

@ObjectType()
export class GetWalletsResponse {
  @Field(() => [Wallet])
  data!: Wallet[];

  @Field(() => Int)
  totalWallets!: number;
}
