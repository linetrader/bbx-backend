// src/app.module.ts
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from './module/users/users.module';
import { WalletsModule } from './module/wallets/wallets.module';
import { AuthMiddleware } from './middleware/auth.middleware';
import { TransactionModule } from './module/transaction/transaction.module';
import { join } from 'path';
import { GoogleOTPModule } from './module/google-otp/google-otp.module';
import { WithdrawListModule } from './module/withdraw-list/withdraw-list.module';

import { PackageModule } from './module/package/package.module';
import { PackageUsersModule } from './module/package-users/package-users.module';
import { PackageRecordModule } from './module/package-record/package-record.module';

import { MiningModule } from './module/mining/mining.module';
import { MiningRecordModule } from './module/mining-record/mining-record.module';

@Module({
  imports: [
    // 환경 변수 설정
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // MongoDB 연결 설정
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        authSource: 'admin', // 관리자 인증이 필요함을 명시
      }),
      inject: [ConfigService],
    }),

    // GraphQL 설정
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'), // 스키마 파일 자동 생성
      context: ({ req }: { req: Request }) => ({ req }), // req 타입 지정
    }),

    // JWT 설정
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),

    // 사용자 모듈 및 지갑 모듈
    UsersModule,
    WalletsModule,
    TransactionModule,
    PackageModule,
    PackageUsersModule,
    PackageRecordModule,
    GoogleOTPModule,
    WithdrawListModule,
    MiningModule,
    MiningRecordModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 모든 요청에 AuthMiddleware 적용
    consumer.apply(AuthMiddleware).forRoutes('*');
  }
}
