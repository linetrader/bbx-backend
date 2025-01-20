import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class GetMiningCustomerResponse {
  @Field(() => ID)
  id!: string;

  @Field()
  username!: string;

  @Field()
  packageType!: string;

  @Field()
  quantity!: number;

  @Field()
  miningBalance!: number;

  @Field(() => String)
  createdAt!: Date;

  @Field(() => String)
  updatedAt!: Date;
}

@ObjectType()
export class GetMiningCustomersResponse {
  @Field(() => [GetMiningCustomerResponse])
  data!: GetMiningCustomerResponse[];

  @Field()
  totalCustomers!: number;
}
