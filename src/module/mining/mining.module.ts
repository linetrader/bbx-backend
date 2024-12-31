import { Module } from '@nestjs/common';
import { MiningResolver } from './mining.resolver';
import { MiningService } from './mining.service';

@Module({
  providers: [MiningResolver, MiningService]
})
export class MiningModule {}
