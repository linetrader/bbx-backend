// src/wallets/dto/get-wallets-response.dto.ts

import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Wallet, WalletsAdmin } from '../wallets.schema';

@ObjectType()
export class GetUserWalletsResponse {
  @Field(() => [Wallet])
  data!: Wallet[];

  @Field(() => Int)
  totalWallets!: number;
}

@ObjectType()
export class GetAdminWalletsResponse {
  @Field(() => [WalletsAdmin])
  data!: WalletsAdmin[];

  @Field(() => Int)
  totalWallets!: number;
}
