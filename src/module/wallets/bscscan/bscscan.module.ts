import { Module } from '@nestjs/common';
import { BscScanService } from './bscscan.service';

@Module({
  providers: [BscScanService],
  exports: [BscScanService], // 외부 모듈에서 사용 가능하도록 exports 추가
})
export class BscScanModule {}
