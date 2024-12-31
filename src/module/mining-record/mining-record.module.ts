import { Module } from '@nestjs/common';
import { MiningRecordResolver } from './mining-record.resolver';
import { MiningRecordService } from './mining-record.service';

@Module({
  providers: [MiningRecordResolver, MiningRecordService]
})
export class MiningRecordModule {}
