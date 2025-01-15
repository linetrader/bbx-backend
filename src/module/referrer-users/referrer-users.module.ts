// src/module/referrer-users/referrer-users.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReferrerUsersResolver } from './referrer-users.resolver';
import { ReferrerUsersService } from './referrer-users.service';
import { ReferrerLogsModule } from '../referrer-logs/referrer-logs.module';
import { WalletsModule } from '../wallets/wallets.module';
import { UsersModule } from '../users/users.module';
import { ReferrerUser, ReferrerUserSchema } from './referrer-users.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReferrerUser.name, schema: ReferrerUserSchema },
    ]),
    UsersModule,
    WalletsModule,
    ReferrerLogsModule,
  ],
  providers: [ReferrerUsersResolver, ReferrerUsersService],
  exports: [ReferrerUsersService],
})
export class ReferrerUsersModule {}
