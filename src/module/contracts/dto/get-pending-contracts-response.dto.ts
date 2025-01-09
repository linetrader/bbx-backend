// src/contracts/dto/get-pending-contracts-response.dto.ts

import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class GetPendingContractsResponse {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  username!: string;

  @Field(() => String)
  packageName!: string;

  @Field(() => Int)
  quantity!: number;

  @Field(() => Int)
  totalPrice!: number;

  @Field(() => String)
  createdAt!: Date;

  @Field(() => String)
  updatedAt!: Date;
}

@ObjectType()
export class GetPendingContractsPaginatedResponse {
  @Field(() => [GetPendingContractsResponse])
  data!: GetPendingContractsResponse[];

  @Field(() => Int)
  totalContracts!: number;
}
