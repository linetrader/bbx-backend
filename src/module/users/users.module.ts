// src/users/users.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersResolver } from './users.resolver';
import { User, UserSchema } from './users.schema';
import { WalletsModule } from 'src/module/wallets/wallets.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    WalletsModule, // WalletsModule 추가
  ],
  providers: [UsersService, UsersResolver],
  exports: [MongooseModule, UsersService], // UserModel을 외부에 내보내기 위해 MongooseModule을 exports
})
export class UsersModule {}
