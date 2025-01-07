import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MiningLog, MiningLogSchema } from './mining-logs.schema';
import { MiningLogsService } from './mining-logs.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MiningLog.name, schema: MiningLogSchema },
    ]),
  ],
  providers: [MiningLogsService],
  exports: [MiningLogsService],
})
export class MiningLogsModule {}
