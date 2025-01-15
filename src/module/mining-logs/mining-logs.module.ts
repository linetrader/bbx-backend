import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MiningLog, MiningLogSchema } from './mining-logs.schema';
import { MiningLogsService } from './mining-logs.service';
import { MiningLogsResolver } from './mining-logs.resolver';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MiningLog.name, schema: MiningLogSchema },
    ]),
  ],
  providers: [MiningLogsResolver, MiningLogsService],
  exports: [MiningLogsService],
})
export class MiningLogsModule {}
