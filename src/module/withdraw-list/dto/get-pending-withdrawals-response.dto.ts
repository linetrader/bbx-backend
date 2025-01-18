import { ObjectType, Field, Int, ID } from '@nestjs/graphql';

@ObjectType()
export class GetPendingWithdrawalsResponse {
  @Field(() => ID)
  id!: string;

  @Field()
  userId!: string;

  @Field()
  username!: string;

  @Field()
  currency!: string;

  @Field(() => Number)
  amount!: number;

  @Field(() => String)
  createdAt!: Date;

  @Field(() => String)
  updatedAt!: Date;
}

@ObjectType()
export class GetPendingWithdrawalsPaginatedResponse {
  @Field(() => [GetPendingWithdrawalsResponse])
  data!: GetPendingWithdrawalsResponse[];

  @Field(() => Int)
  totalWithdrawals!: number;
}
