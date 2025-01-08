import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TotalMiningResolver } from './total-mining.resolver';
import { TotalMiningService } from './total-mining.service';
import { ScheduleModule } from '@nestjs/schedule';
import { TotalMining, TotalMiningSchema } from './total-mining.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: TotalMining.name, schema: TotalMiningSchema },
    ]),
  ],
  providers: [TotalMiningResolver, TotalMiningService],
})
export class TotalMiningModule {}
