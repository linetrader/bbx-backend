// contracts.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContractsResolver } from './contracts.resolver';
import { ContractsService } from './contracts.service';
import {
  DefaultContract,
  DefaultContractSchema,
} from './contracts.default.schema';
import { Contract, ContractSchema } from './contracts.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DefaultContract.name, schema: DefaultContractSchema },
      { name: Contract.name, schema: ContractSchema },
    ]),
    UsersModule,
  ],
  providers: [ContractsResolver, ContractsService],
  exports: [ContractsService], // ContractsService export 추가
})
export class ContractsModule {}
