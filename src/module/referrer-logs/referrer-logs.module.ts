// src/module/referrer-logs/referrer-logs.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReferrerLogsResolver } from './referrer-logs.resolver';
import { ReferrerLogsService } from './referrer-logs.service';
import { ReferrerLog, ReferrerLogSchema } from './referrer-logs.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReferrerLog.name, schema: ReferrerLogSchema },
    ]),
  ],
  providers: [ReferrerLogsResolver, ReferrerLogsService],
  exports: [ReferrerLogsService],
})
export class ReferrerLogsModule {}
